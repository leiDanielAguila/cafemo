"use client";

import Link from "next/link";
import {
	Anchor,
	Button,
	PasswordInput,
	Stack,
	Text,
	TextInput,
} from "@mantine/core";
import { notifications } from "@mantine/notifications";

export default function SignupPage() {
	const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const name = String(formData.get("name") ?? "").trim();
		const email = String(formData.get("email") ?? "").trim();
		const password = String(formData.get("password") ?? "").trim();
		const confirmPassword = String(formData.get("confirmPassword") ?? "").trim();

		if (!name || !email || !password || !confirmPassword) {
			notifications.show({
				color: "red",
				title: "One more sip",
				message: "Please fill every field so we can save your seat.",
			});
			return;
		}

		if (password !== confirmPassword) {
			notifications.show({
				color: "red",
				title: "Passwords don't match",
				message: "Let's try that again so your account brews correctly.",
			});
			return;
		}

		notifications.show({
			color: "teal",
			title: "Account brewed",
			message: "You're all set. Your cozy corner is waiting.",
		});
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-5" noValidate>
			<Stack gap="sm">
				<TextInput
					name="name"
					label="Display name"
					placeholder="How should we greet you?"
					required
					radius="md"
				/>
				<TextInput
					name="email"
					type="email"
					label="Email"
					placeholder="you@cafemo.com"
					required
					radius="md"
				/>
				<PasswordInput
					name="password"
					label="Password"
					placeholder="Create a password"
					required
					radius="md"
				/>
				<PasswordInput
					name="confirmPassword"
					label="Confirm password"
					placeholder="Re-enter your password"
					required
					radius="md"
				/>
			</Stack>

			<Button type="submit" fullWidth radius="xl" size="md">
				Create Account
			</Button>

			<Text size="sm" c="dimmed" ta="center">
				Already have a table?{" "}
				<Anchor component={Link} href="/auth/login" fw={600}>
					Sign in
				</Anchor>
			</Text>
		</form>
	);
}
