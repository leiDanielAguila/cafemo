import menuData from "@/app/kiosk/menu.json";
import { NextResponse } from "next/server";

type ApiChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const FINALIZED_TOKEN = "[FINALIZED]";

type MenuItem = {
  name: string;
  price: number;
};

const MENU_ITEMS: MenuItem[] = [
  ...menuData.menu.beverages.flatMap((group) => group.items),
  ...menuData.menu.food,
  ...menuData.menu.add_ons,
];

const MENU_TEXT = MENU_ITEMS.map(
  (item) => `- ${item.name} ($${item.price.toFixed(2)})`,
).join("\n");

const SYSTEM_PROMPT = [
  "You are CAFEMO, a warm and concise kiosk ordering assistant.",
  "You are ONLY for taking cafe orders from the exact menu below.",
  "Menu (exact names and prices):",
  MENU_TEXT,
  "Task rules:",
  "- When providing a response for prices respond with the Pesos sign as for PHP",
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

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return NextResponse.json(
        { error: "Missing GROQ_API_KEY" },
        { status: 500 },
      );
    }

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
              content: SYSTEM_PROMPT,
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

    return NextResponse.json({
      reply: normalized.reply,
      isFinalized: normalized.isFinalized && !isMenuCorrectionReply,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to process chat request" },
      { status: 500 },
    );
  }
}
