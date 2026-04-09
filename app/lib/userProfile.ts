import type { User as SupabaseUser } from "@supabase/supabase-js";

type UserProfile = {
  displayName: string;
  email: string;
  address: string;
};

type UserMetadata = {
  display_name?: unknown;
  address?: unknown;
};

function toSafeText(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getEmailPrefix(email: string) {
  const emailPrefix = email.split("@")[0]?.trim();
  return emailPrefix || "there";
}

export function mapSupabaseUserToProfile(user: SupabaseUser): UserProfile {
  const metadata = (user.user_metadata ?? {}) as UserMetadata;
  const email = toSafeText(user.email);
  const displayName =
    toSafeText(metadata.display_name) || getEmailPrefix(email);
  const address = toSafeText(metadata.address);

  return {
    displayName,
    email,
    address,
  };
}

export function createProfileFromSignupForm(input: {
  displayName: string;
  email: string;
  address: string;
}): UserProfile {
  const email = input.email.trim();

  return {
    displayName: input.displayName.trim() || getEmailPrefix(email),
    email,
    address: input.address.trim(),
  };
}
