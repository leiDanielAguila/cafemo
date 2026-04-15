"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowClockwiseIcon,
  ImageSquareIcon,
  ListIcon,
} from "@phosphor-icons/react";
import { useUserStore } from "@/app/lib/store/useUserStore";
import { mapSupabaseUserToProfile } from "@/app/lib/userProfile";
import {
  type MatchedMenuItem,
  findTopMatchedMenuItemsByAppearance,
  formatPrice,
  normalizeLabel,
  resolveMenuImagePath,
} from "@/app/lib/menu";
import {
  loadPendingOrderFromStorage,
  type PendingOrder,
  parseOrderItemsFromText,
  savePendingOrderToStorage,
} from "@/app/lib/orderFlow";
import { useMenuDataQuery } from "@/app/lib/useMenuDataQuery";
import { createClient } from "@/app/utils/supabase/client";

type OrderStage = "GATHERING" | "CANCELLED";
type ChatRole = "user" | "assistant";

type ChatMenuCard = {
  name: string;
  priceLabel: string;
  imagePath: string | null;
};

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  cards?: ChatMenuCard[];
  uiOnly?: boolean;
  pending?: boolean;
};

const HERO_SIZE = 250;
const TYPING_DELAY_MS = 22;

function createWelcomeMessage(name: string): ChatMessage {
  return {
    id: "welcome",
    role: "assistant",
    content: `Hey ${name}, welcome to CafeMo. Tell me what you’d like today and I’ll help finalize your order.`,
  };
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function hasExplicitOrderConfirmation(message: string) {
  const normalized = message.toLowerCase();
  return /(confirm|that's all|that is all|finalize|place order|checkout|yes|go ahead)/.test(
    normalized,
  );
}

function hasAssistantOrderCompletionCue(message: string) {
  const normalized = message.toLowerCase();
  return /(order (is )?(confirmed|placed|finalized)|thank(s| you) for ordering|on (the )?way|in progress|will be prepared)/.test(
    normalized,
  );
}

function hasCancelOrderIntent(message: string) {
  const normalized = message.toLowerCase();
  return /(cancel|cancell?ed|canceled|don'?t (want to )?(order|continue|proceed)|do not (want to )?(order|continue|proceed)|won'?t order|wont order|stop (the )?order|abort (the )?order|never mind|nevermind|forget it|no( more)? order)/.test(
    normalized,
  );
}

function hasAssistantCancellationConfirmation(message: string) {
  const normalized = message.toLowerCase();
  return /(order (is )?(cancelled|canceled)|canceled this order|cancelled this order|stopped this order|stop this order|won'?t proceed|will not proceed|won'?t place the order|will not place the order)/.test(
    normalized,
  );
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function toTitleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function detectMentionedSize(
  text: string,
  itemName: string,
): "small" | "medium" | "large" | null {
  const normalizedText = normalizeLabel(text);
  const normalizedItemName = normalizeLabel(itemName);

  const beforePattern = new RegExp(
    `(small|medium|large) ${escapeRegExp(normalizedItemName)}`,
  );
  const beforeMatch = normalizedText.match(beforePattern)?.[1];
  if (
    beforeMatch === "small" ||
    beforeMatch === "medium" ||
    beforeMatch === "large"
  ) {
    return beforeMatch;
  }

  const afterPattern = new RegExp(
    `${escapeRegExp(normalizedItemName)} (small|medium|large)`,
  );
  const afterMatch = normalizedText.match(afterPattern)?.[1];
  if (
    afterMatch === "small" ||
    afterMatch === "medium" ||
    afterMatch === "large"
  ) {
    return afterMatch;
  }

  return null;
}

function createCardsForMessage(
  text: string,
  menuItems: MatchedMenuItem[],
): ChatMenuCard[] {
  return findTopMatchedMenuItemsByAppearance(text, menuItems, 3).map((item) => {
    if (!item.sizes) {
      return {
        name: item.name,
        priceLabel: formatPrice(item.price),
        imagePath: resolveMenuImagePath(item.name),
      };
    }

    const detectedSize = detectMentionedSize(text, item.name);

    if (detectedSize) {
      return {
        name: item.name,
        priceLabel: `${toTitleCase(detectedSize)}: ${formatPrice(item.sizes[detectedSize])}`,
        imagePath: resolveMenuImagePath(item.name),
      };
    }

    return {
      name: item.name,
      priceLabel: `S ${formatPrice(item.sizes.small)} • M ${formatPrice(item.sizes.medium)} • L ${formatPrice(item.sizes.large)}`,
      imagePath: resolveMenuImagePath(item.name),
    };
  });
}

function buildPendingOrderFromUserMessages(input: {
  userMessages: string[];
  displayName: string;
  address: string;
}): PendingOrder | null {
  const aggregatedByItem = new Map<
    string,
    ReturnType<typeof parseOrderItemsFromText>[number]
  >();

  for (const message of input.userMessages) {
    const parsedItems = parseOrderItemsFromText(message);

    for (const parsedItem of parsedItems) {
      const key = `${parsedItem.itemType}:${parsedItem.itemId}`;
      const existing = aggregatedByItem.get(key);

      if (!existing) {
        aggregatedByItem.set(key, { ...parsedItem });
        continue;
      }

      if (parsedItem.quantity > existing.quantity) {
        aggregatedByItem.set(key, {
          ...existing,
          quantity: parsedItem.quantity,
          lineTotal: Number.parseFloat(
            (parsedItem.quantity * existing.unitPrice).toFixed(2),
          ),
        });
      }
    }
  }

  const items = Array.from(aggregatedByItem.values());
  if (items.length === 0) {
    return null;
  }

  const totalAmount = Number.parseFloat(
    items.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
  );

  return {
    items,
    totalAmount,
    displayName: input.displayName.trim(),
    address: input.address.trim(),
    createdAt: new Date().toISOString(),
  };
}

function mergePendingOrders(
  existingOrder: PendingOrder | null,
  incomingOrder: PendingOrder,
): PendingOrder {
  if (!existingOrder) {
    return incomingOrder;
  }

  const mergedByItem = new Map<string, PendingOrder["items"][number]>();

  for (const item of existingOrder.items) {
    mergedByItem.set(`${item.itemType}:${item.itemId}`, { ...item });
  }

  for (const item of incomingOrder.items) {
    const key = `${item.itemType}:${item.itemId}`;
    const existing = mergedByItem.get(key);

    if (!existing) {
      mergedByItem.set(key, { ...item });
      continue;
    }

    const mergedQuantity = existing.quantity + item.quantity;
    mergedByItem.set(key, {
      ...existing,
      quantity: mergedQuantity,
      lineTotal: Number.parseFloat(
        (mergedQuantity * existing.unitPrice).toFixed(2),
      ),
    });
  }

  const mergedItems = Array.from(mergedByItem.values());
  const mergedTotalAmount = Number.parseFloat(
    mergedItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
  );

  return {
    items: mergedItems,
    totalAmount: mergedTotalAmount,
    displayName: incomingOrder.displayName || existingOrder.displayName,
    address: incomingOrder.address || existingOrder.address,
    createdAt: existingOrder.createdAt,
  };
}

export default function KioskClientPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const { data, flattenedMenuItems } = useMenuDataQuery();
  const displayName = useUserStore((state) => state.displayName);
  const email = useUserStore((state) => state.email);
  const address = useUserStore((state) => state.address);
  const setUser = useUserStore((state) => state.setUser);
  const [isHydrated, setIsHydrated] = useState(false);
  const greetingName = useMemo(() => {
    const trimmedDisplayName = displayName.trim();
    if (trimmedDisplayName) {
      return trimmedDisplayName;
    }

    const emailPrefix = email.split("@")[0]?.trim();
    return emailPrefix || "there";
  }, [displayName, email]);
  const initialMessages = useMemo(
    () => [createWelcomeMessage(greetingName)],
    [greetingName],
  );
  const [messages, setMessages] = useState<ChatMessage[]>(
    () => initialMessages,
  );
  const [input, setInput] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [isAnimatingReply, setIsAnimatingReply] = useState(false);
  const [isFinalizingOrder, setIsFinalizingOrder] = useState(false);
  const [isMenuSidebarOpen, setIsMenuSidebarOpen] = useState(false);
  const [orderStage, setOrderStage] = useState<OrderStage>("GATHERING");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const menuCloseButtonRef = useRef<HTMLButtonElement>(null);
  const beverages = data?.beverages ?? [];
  const food = data?.food ?? [];
  const addOns = data?.addOns ?? [];

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    setMessages((previous) => {
      if (
        previous.length !== 1 ||
        previous[0]?.id !== "welcome" ||
        previous[0].content === initialMessages[0].content
      ) {
        return previous;
      }

      return initialMessages;
    });
  }, [initialMessages]);

  useEffect(() => {
    const hasUserInStore =
      displayName.trim().length > 0 ||
      email.trim().length > 0 ||
      address.trim().length > 0;

    if (hasUserInStore) {
      return;
    }

    const hydrateUser = async () => {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        router.replace("/auth/login");
        return;
      }

      setUser(mapSupabaseUserToProfile(data.user));
    };

    hydrateUser();
  }, [address, displayName, email, router, setUser, supabase]);

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!isMenuSidebarOpen) {
      return;
    }

    menuCloseButtonRef.current?.focus();

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsMenuSidebarOpen(false);
      }
    };

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isMenuSidebarOpen]);

  const canSend = useMemo(
    () =>
      input.trim().length > 0 &&
      orderStage === "GATHERING" &&
      !isThinking &&
      !isAnimatingReply &&
      !isFinalizingOrder,
    [input, orderStage, isThinking, isAnimatingReply, isFinalizingOrder],
  );

  const heroIsSpeaking = isHydrated && (isThinking || isAnimatingReply);
  const isTerminalStage = orderStage === "CANCELLED";
  const terminalStatusText = "Order canceled. Input is now locked.";
  const terminalPlaceholder =
    orderStage === "CANCELLED" ? "Order canceled" : "Type your order here";

  async function animateAssistantReply(
    placeholderId: string,
    fullReply: string,
  ): Promise<void> {
    const replyToAnimate = fullReply.trim();
    if (!replyToAnimate) {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === placeholderId
            ? {
                id: placeholderId,
                role: "assistant",
                content:
                  "I’m sorry, I couldn’t process that. Please tell me your order one more time.",
              }
            : message,
        ),
      );
      return;
    }

    setIsAnimatingReply(true);
    setMessages((previous) =>
      previous.map((message) =>
        message.id === placeholderId
          ? {
              id: placeholderId,
              role: "assistant",
              content: replyToAnimate[0],
            }
          : message,
      ),
    );

    try {
      for (let index = 2; index <= replyToAnimate.length; index += 1) {
        await new Promise((resolve) => {
          window.setTimeout(resolve, TYPING_DELAY_MS);
        });

        if (!isMountedRef.current) {
          return;
        }

        const partialReply = replyToAnimate.slice(0, index);
        setMessages((previous) =>
          previous.map((message) =>
            message.id === placeholderId
              ? {
                  ...message,
                  content: partialReply,
                }
              : message,
          ),
        );
      }
    } finally {
      if (isMountedRef.current) {
        setIsAnimatingReply(false);
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const userContent = input.trim();
    if (!userContent || !canSend) {
      return;
    }

    const userMessage: ChatMessage = {
      id: createId("user"),
      role: "user",
      content: userContent,
    };

    if (hasCancelOrderIntent(userContent)) {
      setInput("");
      setOrderStage("CANCELLED");
      setMessages((previous) => [
        ...previous,
        userMessage,
        {
          id: createId("assistant"),
          role: "assistant",
          content:
            "No problem — I canceled this order. Tap Start New Order whenever you're ready.",
          uiOnly: true,
        },
      ]);
      return;
    }

    const placeholderId = createId("assistant-pending");
    const placeholderMessage: ChatMessage = {
      id: placeholderId,
      role: "assistant",
      content: "...",
      uiOnly: true,
      pending: true,
    };

    const nextMessages = [...messages, userMessage, placeholderMessage];
    setInput("");
    setIsThinking(true);
    setMessages(nextMessages);

    const historyForApi = nextMessages
      .filter(
        (message) =>
          !message.uiOnly &&
          (message.role === "user" || message.role === "assistant"),
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: historyForApi }),
      });

      if (!response.ok) {
        const errorPayload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        const errorMessage = errorPayload?.error?.trim();
        throw new Error(errorMessage || "Failed to fetch assistant response.");
      }

      const data = (await response.json()) as {
        reply?: string;
        isFinalized?: boolean;
        isCancelled?: boolean;
      };

      const assistantReply =
        data.reply?.trim() ||
        "I’m sorry, I couldn’t process that. Please tell me your order one more time.";

      await animateAssistantReply(placeholderId, assistantReply);

      const assistantCards = createCardsForMessage(
        assistantReply,
        flattenedMenuItems,
      );

      setMessages((previous) =>
        previous.map((message) => {
          if (message.id === placeholderId) {
            return {
              ...message,
              cards: assistantCards,
            };
          }

          return message;
        }),
      );

      const cancellationDetected =
        Boolean(data.isCancelled) ||
        hasCancelOrderIntent(userContent) ||
        hasAssistantCancellationConfirmation(assistantReply);

      if (cancellationDetected) {
        setOrderStage("CANCELLED");
        return;
      }

      const confirmedInHistory = historyForApi
        .filter((message) => message.role === "user")
        .some((message) => hasExplicitOrderConfirmation(message.content));
      const shouldFinalizeOrder =
        (data.isFinalized && !cancellationDetected) ||
        (confirmedInHistory && hasAssistantOrderCompletionCue(assistantReply));

      if (shouldFinalizeOrder) {
        setIsFinalizingOrder(true);

        const userMessages = historyForApi
          .filter((message) => message.role === "user")
          .map((message) => message.content);

        const pendingOrder = buildPendingOrderFromUserMessages({
          userMessages,
          displayName: greetingName,
          address,
        });

        if (!pendingOrder) {
          setIsFinalizingOrder(false);
          setMessages((previous) => [
            ...previous,
            {
              id: createId("assistant"),
              role: "assistant",
              content:
                "I confirmed your order, but I couldn’t extract line items yet. Please resend the order with item names and sizes before finalizing.",
              uiOnly: true,
            },
          ]);
          return;
        }

        const existingPendingOrder = loadPendingOrderFromStorage();
        const mergedPendingOrder = mergePendingOrders(
          existingPendingOrder,
          pendingOrder,
        );

        savePendingOrderToStorage(mergedPendingOrder);
        setMessages((previous) => [
          ...previous,
          {
            id: createId("assistant"),
            role: "assistant",
            content:
              "Order confirmed. Opening your tracking page in 3 seconds...",
            uiOnly: true,
          },
        ]);

        await new Promise((resolve) => {
          window.setTimeout(resolve, 3000);
        });

        router.push("/dashboard/track-order");
        return;
      }
    } catch (error) {
      setIsAnimatingReply(false);
      const detail =
        error instanceof Error && error.message ? ` (${error.message})` : "";
      setMessages((previous) =>
        previous.map((message) =>
          message.id === placeholderId
            ? {
                id: createId("assistant"),
                role: "assistant",
                content: `I’m having trouble reaching the kitchen system right now, but I’m still here to help. Could you repeat your order in one message?${detail}`,
              }
            : message,
        ),
      );
    } finally {
      setIsFinalizingOrder(false);
      setIsThinking(false);
    }
  }

  function handleStartNewOrder() {
    setMessages(initialMessages);
    setInput("");
    setIsThinking(false);
    setIsAnimatingReply(false);
    setIsFinalizingOrder(false);
    setOrderStage("GATHERING");
  }

  function closeMenuSidebar() {
    setIsMenuSidebarOpen(false);
  }

  return (
    <main className="px-4 pb-8 pt-6 md:px-8">
      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 lg:flex-row">
        <aside className="flex flex-col items-center justify-start px-2 pt-2 text-center lg:w-[360px]">
          <div
            className="relative"
            style={{ width: HERO_SIZE + 96, height: HERO_SIZE + 96 }}
          >
            <Image
              src={heroIsSpeaking ? "/hero.gif" : "/hero.svg"}
              alt="CAFEMO assistant"
              fill
              className="object-contain drop-shadow-[0_18px_30px_rgba(72,65,73,0.16)]"
              unoptimized={heroIsSpeaking}
              priority
            />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-[var(--color-charcoal)]">
            CafeMo Kiosk
          </h1>
          <button
            type="button"
            onClick={() => setIsMenuSidebarOpen((previous) => !previous)}
            aria-expanded={isMenuSidebarOpen}
            aria-controls="kiosk-menu-sidebar"
            className="mt-3 inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
            style={{ backgroundColor: "#5b5fd0" }}
          >
            <ListIcon size={16} weight="bold" />
            {isMenuSidebarOpen ? "Hide Menu" : "View Menu"}
          </button>
          <p className="mt-2 text-sm text-[var(--color-charcoal)]/80">
            Stage: <span className="font-semibold">{orderStage}</span>
          </p>
          {isTerminalStage && (
            <>
              <p className="mt-3 text-sm font-medium text-[var(--color-violet)]">
                {terminalStatusText}
              </p>
              <button
                type="button"
                onClick={handleStartNewOrder}
                className="mt-3 rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: "#5b5fd0" }}
              >
                Start New Order
              </button>
            </>
          )}
        </aside>

        <div
          className={`glass-card flex h-[70vh] min-h-0 flex-1 flex-col rounded-3xl p-4 transition-opacity md:p-6 ${
            isMenuSidebarOpen ? "opacity-80" : "opacity-100"
          }`}
        >
          <div
            ref={scrollContainerRef}
            className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-2xl p-4"
            style={{ backgroundColor: "#9bb29e" }}
          >
            {messages.map((message) => {
              const fromUser = message.role === "user";
              return (
                <div
                  key={message.id}
                  className={`flex ${fromUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-md leading-relaxed text-[var(--color-charcoal)] md:max-w-[70%] ${
                      fromUser ? "rounded-br-sm" : "rounded-bl-sm"
                    }`}
                    style={{ backgroundColor: "#ffffff" }}
                  >
                    {message.content}

                    {message.cards && message.cards.length > 0 && (
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {message.cards.map((card, index) => (
                          <article
                            key={`${message.id}-${card.name}-${index}`}
                            className="glass-card w-32 shrink-0 rounded-xl p-2"
                          >
                            <div className="relative aspect-square w-full overflow-hidden rounded-lg bg-white/80">
                              {card.imagePath ? (
                                <Image
                                  src={card.imagePath}
                                  alt={card.name}
                                  fill
                                  sizes="128px"
                                  className="object-contain p-2"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[var(--color-charcoal)]/45">
                                  <ImageSquareIcon size={26} weight="duotone" />
                                </div>
                              )}
                            </div>
                            <p className="mt-2 line-clamp-2 text-xs font-semibold text-[var(--color-charcoal)]">
                              {card.name}
                            </p>
                            <p className="mt-1 text-xs font-semibold text-[var(--color-violet)]">
                              {card.priceLabel}
                            </p>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="mt-4 flex gap-3">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder={terminalPlaceholder}
              disabled={
                orderStage !== "GATHERING" ||
                isThinking ||
                isAnimatingReply ||
                isFinalizingOrder
              }
              className="flex-1 rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--color-charcoal)] outline-none transition focus:border-[var(--color-violet)]"
            />
            <button
              type="submit"
              disabled={!canSend}
              className="rounded-xl px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-55"
              style={{ backgroundColor: "#5b5fd0" }}
            >
              Send
            </button>
            <button
              type="button"
              onClick={handleStartNewOrder}
              aria-label="Restart order"
              title="Restart order"
              className="rounded-xl p-3 text-white transition hover:opacity-95"
              style={{ backgroundColor: "#5b5fd0" }}
            >
              <ArrowClockwiseIcon size={18} weight="bold" />
            </button>
          </form>
        </div>
      </section>

      {isMenuSidebarOpen && (
        <aside
          id="kiosk-menu-sidebar"
          className="fixed left-0 top-0 z-50 h-full w-full max-w-sm overflow-y-auto border-r border-white/35 bg-[#f7f2ec] p-5 shadow-[0_16px_38px_rgba(0,0,0,0.22)]"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-[var(--color-charcoal)]">
              Menu
            </h2>
            <button
              type="button"
              onClick={closeMenuSidebar}
              ref={menuCloseButtonRef}
              className="rounded-lg border border-[var(--border)] bg-white px-3 py-1.5 text-sm font-semibold text-[var(--color-charcoal)] transition hover:bg-[var(--surface)]"
            >
              Close
            </button>
          </div>

          <div className="mt-6 space-y-6">
            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/70">
                Beverages
              </h3>
              <div className="mt-3 space-y-4">
                {beverages.map((group) => (
                  <div
                    key={group.category}
                    className="rounded-xl bg-white/70 p-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.15em] text-[var(--color-charcoal)]/70">
                      {group.category}
                    </p>
                    <ul className="mt-2 space-y-2">
                      {group.items.map((item) => (
                        <li
                          key={`${group.category}-${item.name}`}
                          className="text-sm text-[var(--color-charcoal)]"
                        >
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-xs text-[var(--color-charcoal)]/75">
                            S {formatPrice(item.sizes.small)} • M{" "}
                            {formatPrice(item.sizes.medium)} • L{" "}
                            {formatPrice(item.sizes.large)}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/70">
                Food
              </h3>
              <ul className="mt-3 space-y-2 rounded-xl bg-white/70 p-3">
                {food.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-3 text-sm text-[var(--color-charcoal)]"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="shrink-0 font-semibold text-[var(--color-violet)]">
                      {formatPrice(item.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section>
              <h3 className="text-sm font-semibold uppercase tracking-[0.16em] text-[var(--color-charcoal)]/70">
                Add-ons
              </h3>
              <ul className="mt-3 space-y-2 rounded-xl bg-white/70 p-3">
                {addOns.map((item) => (
                  <li
                    key={item.name}
                    className="flex items-center justify-between gap-3 text-sm text-[var(--color-charcoal)]"
                  >
                    <span className="font-medium">{item.name}</span>
                    <span className="shrink-0 font-semibold text-[var(--color-violet)]">
                      {formatPrice(item.price)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </aside>
      )}
    </main>
  );
}
