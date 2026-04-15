import { formatPrice } from "@/app/lib/menu";
import { fetchMenuData } from "@/app/lib/menuData";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

type ApiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const FINALIZED_TOKEN = "[FINALIZED]";
const MENU_PROMPT_CACHE_TTL_MS = 5 * 60 * 1000;

let systemPromptCache: {
  value: string;
  expiresAt: number;
} | null = null;

function buildSystemPrompt(menuText: string) {
  return [
    "You are CAFEMO, a warm and concise kiosk ordering assistant.",
    "You are ONLY for taking cafe orders from the exact menu below.",
    "Menu (exact names and prices):",
    menuText,
    "Task rules:",
    "- When providing a response for prices respond with the Pesos sign as for PHP",
    "- When a client mentions he/she is sad recommend warm hot drinks vice versa for happiness should be cold drinks",
    "- If a user requests an item not in the menu, gently ask them to check the menu and order from available items only.",
    "- If a user asks for anything unrelated to ordering, gently explain you are only for cafe ordering tasks.",
    "- Emotional chats are allowed only when still connected to coffee/ordering recommendations (for example: feeling sad today, or having a great day).",
    "- Any recommendation must be real menu items listed above.",
    "- Never invent items, prices, or gibberish names.",
    "- When a user says he wont order anymore proceed to stop the order.",
    "Tone rules:",
    "- Be friendly, short, and clear.",
    "- Ask at most one follow-up question at a time.",
    "- Confirm order details before finalizing.",
    "Critical instruction:",
    `- When the user has fully confirmed their order, append the exact token ${FINALIZED_TOKEN} at the end of your response.`,
    "- Do not add the token before the order is fully confirmed.",
  ].join("\n");
}

async function getSystemPrompt() {
  const now = Date.now();
  if (systemPromptCache && systemPromptCache.expiresAt > now) {
    return systemPromptCache.value;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;
  const supabaseKey = serviceRoleKey ?? publishableKey;

  if (!supabaseUrl || !supabaseKey) {
    if (systemPromptCache) {
      return systemPromptCache.value;
    }

    return buildSystemPrompt(
      "- Menu is temporarily unavailable. Please ask the user to try again shortly.",
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    const menuData = await fetchMenuData(supabase);

    const beverageMenuText = menuData.beverages
      .flatMap((group) => group.items)
      .map(
        (item) =>
          `- ${item.name} (small: ${formatPrice(item.sizes.small)}, medium: ${formatPrice(item.sizes.medium)}, large: ${formatPrice(item.sizes.large)})`,
      )
      .join("\n");

    const nonBeverageMenuText = [...menuData.food, ...menuData.addOns]
      .map((item) => `- ${item.name} (${formatPrice(item.price)})`)
      .join("\n");

    const menuText = [beverageMenuText, nonBeverageMenuText]
      .filter((text) => text.length > 0)
      .join("\n");

    const systemPrompt = buildSystemPrompt(menuText);
    systemPromptCache = {
      value: systemPrompt,
      expiresAt: now + MENU_PROMPT_CACHE_TTL_MS,
    };

    return systemPrompt;
  } catch {
    if (systemPromptCache) {
      return systemPromptCache.value;
    }

    return buildSystemPrompt(
      "- Menu is temporarily unavailable. Please ask the user to try again shortly.",
    );
  }
}

function normalizeReply(rawReply: string) {
  const trimmed = rawReply.trim();
  if (trimmed.endsWith(FINALIZED_TOKEN)) {
    return {
      reply: trimmed.slice(0, -FINALIZED_TOKEN.length).trimEnd(),
      isFinalized: true,
    };
  }

  return {
    reply: trimmed,
    isFinalized: false,
  };
}

function hasCancellationIntent(message: string) {
  const normalized = message.toLowerCase();
  return /(cancel|cancell?ed|canceled|don'?t (want to )?(order|continue|proceed)|do not (want to )?(order|continue|proceed)|won'?t order|wont order|stop (the )?order|abort (the )?order|never mind|nevermind|forget it|no( more)? order)/.test(
    normalized,
  );
}

function hasCancellationAcknowledgement(message: string) {
  const normalized = message.toLowerCase();
  return /(order (is )?(cancelled|canceled)|canceled this order|cancelled this order|stopped this order|stop this order|won'?t proceed|will not proceed|won'?t place the order|will not place the order)/.test(
    normalized,
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { messages?: ApiChatMessage[] };

    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return NextResponse.json(
        { error: "messages are required" },
        { status: 400 },
      );
    }

    const safeMessages = body.messages
      .filter(
        (message): message is ApiChatMessage =>
          Boolean(message) &&
          (message.role === "user" || message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim().length > 0,
      )
      .map((message) => ({
        role: message.role,
        content: message.content.trim(),
      }));

    if (safeMessages.length === 0) {
      return NextResponse.json(
        { error: "No valid messages found" },
        { status: 400 },
      );
    }

    const latestUserMessage = [...safeMessages]
      .reverse()
      .find((message) => message.role === "user");
    const cancellationRequested = latestUserMessage
      ? hasCancellationIntent(latestUserMessage.content)
      : false;

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY" },
        { status: 500 },
      );
    }

    const systemPrompt = await getSystemPrompt();

    const groqResponse = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          temperature: 0.6,
          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            ...safeMessages,
          ],
        }),
      },
    );

    if (!groqResponse.ok) {
      return NextResponse.json(
        { error: "Groq request failed" },
        { status: 502 },
      );
    }

    const groqPayload = (await groqResponse.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const rawReply = groqPayload.choices?.[0]?.message?.content;
    if (!rawReply) {
      return NextResponse.json(
        { error: "Empty assistant response" },
        { status: 502 },
      );
    }

    const normalized = normalizeReply(rawReply);

    const replyLower = normalized.reply.toLowerCase();
    const isMenuCorrectionReply =
      replyLower.includes("not on the menu") ||
      replyLower.includes("choose from the menu");
    const isCancellationReply = hasCancellationAcknowledgement(
      normalized.reply,
    );

    return NextResponse.json({
      reply: normalized.reply,
      isFinalized:
        normalized.isFinalized &&
        !isMenuCorrectionReply &&
        !cancellationRequested &&
        !isCancellationReply,
      isCancelled: cancellationRequested || isCancellationReply,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 },
    );
  }
}
