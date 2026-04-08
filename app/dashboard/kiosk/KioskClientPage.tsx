"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowClockwiseIcon, ImageSquareIcon } from "@phosphor-icons/react";
import { useUserStore } from "@/app/lib/store/useUserStore";
import { mapSupabaseUserToProfile } from "@/app/lib/userProfile";
import {
  findTopMatchedMenuItemsByAppearance,
  formatPrice,
  normalizeLabel,
  resolveMenuImagePath,
} from "@/app/lib/menu";
import { createClient } from "@/app/utils/supabase/client";

type OrderStage = "GATHERING" | "PROCESSING" | "COMPLETED" | "CANCELLED";
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

function hasCancelOrderIntent(message: string) {
  const normalized = message.toLowerCase();
  return /(cancel|cancell?ed|don'?t proceed|do not proceed|not proceed|stop order|abort order|never mind|nevermind|forget it)/.test(
    normalized,
  );
}

function hasAssistantCancellationConfirmation(message: string) {
  const normalized = message.toLowerCase();
  return /(order (is )?(cancelled|canceled)|canceled this order|cancelled this order)/.test(
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

function createCardsForMessage(text: string): ChatMenuCard[] {
  return findTopMatchedMenuItemsByAppearance(text, 3).map((item) => {
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

export default function KioskClientPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
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
  const [orderStage, setOrderStage] = useState<OrderStage>("GATHERING");
  const [processingStep, setProcessingStep] = useState<string>("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);

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
    if (orderStage !== "PROCESSING") {
      return;
    }

    setProcessingStep("Checking inventory…");

    const inventoryTimer = window.setTimeout(() => {
      setProcessingStep("Pushing order to kitchen queue…");

      const kitchenTimer = window.setTimeout(() => {
        setProcessingStep("");
        setOrderStage("COMPLETED");
        setMessages((previous) => [
          ...previous,
          {
            id: createId("assistant"),
            role: "assistant",
            content:
              "Your order is confirmed and in progress. Thanks for ordering with CAFEMO!",
            uiOnly: true,
          },
        ]);
      }, 1700);

      return () => {
        window.clearTimeout(kitchenTimer);
      };
    }, 1500);

    return () => {
      window.clearTimeout(inventoryTimer);
    };
  }, [orderStage]);

  const canSend = useMemo(
    () =>
      input.trim().length > 0 &&
      orderStage === "GATHERING" &&
      !isThinking &&
      !isAnimatingReply,
    [input, orderStage, isThinking, isAnimatingReply],
  );

  const heroIsSpeaking = isHydrated && (isThinking || isAnimatingReply);
  const isTerminalStage =
    orderStage === "COMPLETED" || orderStage === "CANCELLED";
  const terminalStatusText =
    orderStage === "COMPLETED"
      ? "Order completed. Input is now locked."
      : "Order canceled. Input is now locked.";
  const terminalPlaceholder =
    orderStage === "COMPLETED"
      ? "Order completed"
      : orderStage === "CANCELLED"
        ? "Order canceled"
        : orderStage === "PROCESSING"
          ? "Processing order..."
          : "Type your order here";

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
        throw new Error("Failed to fetch assistant response.");
      }

      const data = (await response.json()) as {
        reply?: string;
        isFinalized?: boolean;
      };

      const assistantReply =
        data.reply?.trim() ||
        "I’m sorry, I couldn’t process that. Please tell me your order one more time.";

      await animateAssistantReply(placeholderId, assistantReply);

      const assistantCards = createCardsForMessage(assistantReply);

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

      if (hasAssistantCancellationConfirmation(assistantReply)) {
        setOrderStage("CANCELLED");
        return;
      }

      if (data.isFinalized && hasExplicitOrderConfirmation(userContent)) {
        setOrderStage("PROCESSING");
      }
    } catch {
      setIsAnimatingReply(false);
      setMessages((previous) =>
        previous.map((message) =>
          message.id === placeholderId
            ? {
                id: createId("assistant"),
                role: "assistant",
                content:
                  "I’m having trouble reaching the kitchen system right now, but I’m still here to help. Could you repeat your order in one message?",
              }
            : message,
        ),
      );
    } finally {
      setIsThinking(false);
    }
  }

  function handleStartNewOrder() {
    setMessages(initialMessages);
    setInput("");
    setIsThinking(false);
    setIsAnimatingReply(false);
    setProcessingStep("");
    setOrderStage("GATHERING");
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
          <p className="mt-2 text-sm text-[var(--color-charcoal)]/80">
            Stage: <span className="font-semibold">{orderStage}</span>
          </p>
          {orderStage === "PROCESSING" && (
            <p className="mt-3 text-sm font-medium text-[var(--color-violet)]">
              {processingStep}
            </p>
          )}
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

        <div className="glass-card flex h-[70vh] min-h-0 flex-1 flex-col rounded-3xl p-4 md:p-6">
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
                orderStage !== "GATHERING" || isThinking || isAnimatingReply
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
    </main>
  );
}
