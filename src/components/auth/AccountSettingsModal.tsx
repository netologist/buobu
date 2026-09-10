"use client";

import { useState, useRef, useEffect } from "react";
import {
	Camera,
	KeyRound,
	Mail,
	Loader2,
	CheckCircle2,
	AlertCircle,
	Link2,
	Link2Off,
	Trash2,
	CreditCard,
	User,
	Lock,
	Sparkles,
	Users,
	LayoutGrid,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
	updatePassword,
	updateEmail,
	uploadAvatar,
	removeAvatar,
	getLinkedIdentities,
	linkGoogleAccount,
	unlinkGoogleAccount,
} from "@/lib/auth";
import { BillingSection } from "./BillingSection";
import { ApiKeysManager } from "./ApiKeysManager";
import { ReferralSection } from "./ReferralSection";
import { WorkspaceCustomizationPanel } from "@/components/settings/WorkspaceCustomizationPanel";
import { useEntitlements } from "@/stores/entitlements-store";
import { startCheckout } from "@/lib/subscriptions/checkout";
import { BILLING_ENABLED, INVITE_CODES_ENABLED, LOCAL_MODE } from "@/lib/feature-flags";

const YEARLY_PRICE_ID = process.env.NEXT_PUBLIC_STRIPE_PRICE_PLUS_YEARLY ?? "";

export type SettingsTab =
	| "profile"
	| "account"
	| "workspace"
	| "connected"
	| "billing"
	| "mcp"
	| "referrals";

type SettingsNavItem = { id: SettingsTab; label: string; icon: React.ElementType };

/**
 * Local Mode keeps only workspace customisation: there is no account, no billing,
 * no referrals and no API keys, and Workspace is backend-independent.
 */
const LOCAL_MODE_NAV_ITEMS: SettingsNavItem[] = [
	{ id: "workspace", label: "Workspace", icon: LayoutGrid },
];

const CLOUD_MODE_NAV_ITEMS: SettingsNavItem[] =
	[
		{ id: "profile", label: "Profile", icon: User },
		{ id: "account", label: "Account", icon: Mail },
		{ id: "workspace", label: "Workspace", icon: LayoutGrid },
		{ id: "connected", label: "Connected Accounts", icon: Link2 },
		{ id: "mcp", label: "MCP & API Keys", icon: KeyRound },
		...(BILLING_ENABLED
			? [
					{
						id: "billing" as SettingsTab,
						label: "Plan & Billing",
						icon: CreditCard,
					},
				]
			: []),
		...(INVITE_CODES_ENABLED
			? [
					{
						id: "referrals" as SettingsTab,
						label: "Invite Friends",
						icon: Users,
					},
				]
			: []),
	];

const NAV_ITEMS = LOCAL_MODE ? LOCAL_MODE_NAV_ITEMS : CLOUD_MODE_NAV_ITEMS;

interface AccountSettingsModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	user: { id: string; email?: string; avatarUrl?: string } | null;
	onAvatarUpdated?: (url: string) => void;
	initialTab?: SettingsTab;
}

type FieldStatus = { type: "success" | "error"; message: string } | null;

export function AccountSettingsModal({
	open,
	onOpenChange,
	user,
	onAvatarUpdated,
	initialTab = "profile",
}: AccountSettingsModalProps) {
	const [activeTab, setActiveTab] = useState<SettingsTab>(LOCAL_MODE ? "workspace" : initialTab);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const { isPlus } = useEntitlements();

	// Avatar
	const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
	const [avatarFile, setAvatarFile] = useState<File | null>(null);
	const [avatarStatus, setAvatarStatus] = useState<FieldStatus>(null);
	const [avatarLoading, setAvatarLoading] = useState(false);
	const [removeAvatarLoading, setRemoveAvatarLoading] = useState(false);

	// Email
	const [newEmail, setNewEmail] = useState("");
	const [emailStatus, setEmailStatus] = useState<FieldStatus>(null);
	const [emailLoading, setEmailLoading] = useState(false);

	// Password
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [passwordStatus, setPasswordStatus] = useState<FieldStatus>(null);
	const [passwordLoading, setPasswordLoading] = useState(false);

	// Connected accounts
	const [googleIdentityId, setGoogleIdentityId] = useState<string | null>(null);
	const [googleEmail, setGoogleEmail] = useState<string | null>(null);
	const [identitiesLoading, setIdentitiesLoading] = useState(false);
	const [googleStatus, setGoogleStatus] = useState<FieldStatus>(null);
	const [googleActionLoading, setGoogleActionLoading] = useState(false);

	useEffect(() => {
		if (!open) return;
		setActiveTab(initialTab);
		setIdentitiesLoading(true);
		setGoogleStatus(null);
		getLinkedIdentities()
			.then((identities) => {
				const google = identities.find((i) => i.provider === "google");
				setGoogleIdentityId(google?.identityId ?? null);
				setGoogleEmail(google?.email ?? null);
			})
			.finally(() => setIdentitiesLoading(false));
	}, [open, initialTab]);

	async function handleLinkGoogle() {
		setGoogleActionLoading(true);
		setGoogleStatus(null);
		try {
			await linkGoogleAccount();
			// Page will redirect to Google OAuth, no need for further state update
		} catch (err) {
			setGoogleStatus({
				type: "error",
				message:
					err instanceof Error ? err.message : "Failed to link Google account.",
			});
			setGoogleActionLoading(false);
		}
	}

	async function handleUnlinkGoogle() {
		if (!googleIdentityId) return;
		setGoogleActionLoading(true);
		setGoogleStatus(null);
		try {
			await unlinkGoogleAccount(googleIdentityId);
			setGoogleIdentityId(null);
			setGoogleEmail(null);
			setGoogleStatus({ type: "success", message: "Google account unlinked." });
		} catch (err) {
			setGoogleStatus({
				type: "error",
				message:
					err instanceof Error
						? err.message
						: "Failed to unlink Google account.",
			});
		} finally {
			setGoogleActionLoading(false);
		}
	}

	function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
		const file = e.target.files?.[0];
		if (!file) return;

		if (!file.type.startsWith("image/")) {
			setAvatarStatus({
				type: "error",
				message: "Please select an image file.",
			});
			return;
		}

		if (file.size > 2 * 1024 * 1024) {
			setAvatarStatus({
				type: "error",
				message: "Image must be smaller than 2 MB.",
			});
			return;
		}

		setAvatarFile(file);
		setAvatarPreview(URL.createObjectURL(file));
		setAvatarStatus(null);
	}

	async function handleAvatarUpload() {
		if (!avatarFile || !user) return;
		setAvatarLoading(true);
		setAvatarStatus(null);
		try {
			const url = await uploadAvatar(user.id, avatarFile);
			setAvatarStatus({
				type: "success",
				message: "Avatar updated successfully.",
			});
			setAvatarFile(null);
			onAvatarUpdated?.(url);
		} catch (err) {
			setAvatarStatus({
				type: "error",
				message:
					err instanceof Error ? err.message : "Failed to upload avatar.",
			});
		} finally {
			setAvatarLoading(false);
		}
	}

	async function handleRemoveAvatar() {
		if (!user) return;
		setRemoveAvatarLoading(true);
		setAvatarStatus(null);
		try {
			await removeAvatar(user.id);
			setAvatarPreview(null);
			setAvatarFile(null);
			setAvatarStatus({ type: "success", message: "Avatar removed." });
			onAvatarUpdated?.("");
		} catch (err) {
			setAvatarStatus({
				type: "error",
				message:
					err instanceof Error ? err.message : "Failed to remove avatar.",
			});
		} finally {
			setRemoveAvatarLoading(false);
		}
	}

	async function handleEmailChange(e: React.FormEvent) {
		e.preventDefault();
		if (!newEmail.trim()) return;
		setEmailLoading(true);
		setEmailStatus(null);
		try {
			// Unlink Google identity BEFORE changing email — don't wait for the
			// DB trigger which only fires after email confirmation (timing window).
			if (googleIdentityId && googleEmail && googleEmail === user?.email) {
				await unlinkGoogleAccount(googleIdentityId);
				setGoogleIdentityId(null);
				setGoogleEmail(null);
			}

			await updateEmail(newEmail.trim());
			setEmailStatus({
				type: "success",
				message: "Confirmation sent to new address. Check your inbox.",
			});
			setNewEmail("");
		} catch (err) {
			setEmailStatus({
				type: "error",
				message: err instanceof Error ? err.message : "Failed to update email.",
			});
		} finally {
			setEmailLoading(false);
		}
	}

	async function handlePasswordChange(e: React.FormEvent) {
		e.preventDefault();
		if (newPassword.length < 8) {
			setPasswordStatus({
				type: "error",
				message: "Password must be at least 8 characters.",
			});
			return;
		}
		if (newPassword !== confirmPassword) {
			setPasswordStatus({ type: "error", message: "Passwords do not match." });
			return;
		}
		setPasswordLoading(true);
		setPasswordStatus(null);
		try {
			await updatePassword(newPassword);
			setPasswordStatus({
				type: "success",
				message: "Password updated successfully.",
			});
			setNewPassword("");
			setConfirmPassword("");
		} catch (err) {
			setPasswordStatus({
				type: "error",
				message:
					err instanceof Error ? err.message : "Failed to update password.",
			});
		} finally {
			setPasswordLoading(false);
		}
	}

	const currentAvatarUrl = avatarPreview ?? user?.avatarUrl;
	const initials = user?.email?.slice(0, 2).toUpperCase() ?? "?";

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="flex flex-col gap-0 p-0 sm:max-w-[720px] overflow-hidden h-[min(680px,90vh)]">
				<DialogHeader className="sr-only">
					<DialogTitle>Settings</DialogTitle>
				</DialogHeader>

				<div className="flex min-h-0 flex-1">
					{/* ── Sidebar ── */}
					<aside className="flex w-52 shrink-0 flex-col border-r">
						{/* User summary */}
						<div className="flex flex-col items-center gap-2 border-b p-4 pb-3">
							<div className="relative">
								<Avatar className="h-12 w-12">
									{currentAvatarUrl ? (
										<AvatarImage src={currentAvatarUrl} alt="Avatar" />
									) : null}
									<AvatarFallback>{initials}</AvatarFallback>
								</Avatar>
								{BILLING_ENABLED && isPlus && (
									<span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 ring-2 ring-background dark:bg-amber-500">
										<Sparkles className="h-2.5 w-2.5 text-white" />
									</span>
								)}
							</div>
							<p className="w-full truncate text-center text-xs text-muted-foreground">
								{user?.email}
							</p>
							{BILLING_ENABLED && isPlus && (
								<span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
									<Sparkles className="h-2.5 w-2.5" />
									Plus
								</span>
							)}
						</div>

						{/* Nav */}
						<nav className="flex flex-col gap-0.5 p-2">
							{NAV_ITEMS.map(({ id, label, icon: Icon }) => (
								<button
									key={id}
									type="button"
									onClick={() => setActiveTab(id)}
									className={cn(
										"flex items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
										activeTab === id
											? "bg-accent text-accent-foreground"
											: "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
									)}
								>
									<Icon className="h-4 w-4 shrink-0" />
									{label}
								</button>
							))}
						</nav>
					</aside>

					{/* ── Content ── */}
					<div className="flex-1 min-w-0 overflow-y-auto p-6">
						{/* Profile tab */}
						{activeTab === "profile" && (
							<div className="space-y-5">
								<div>
									<h2 className="text-base font-semibold">Profile Picture</h2>
									<p className="text-sm text-muted-foreground">
										Update your profile photo.
									</p>
								</div>
								<div className="flex items-center gap-5">
									<Avatar className="h-20 w-20">
										{currentAvatarUrl ? (
											<AvatarImage src={currentAvatarUrl} alt="Avatar" />
										) : null}
										<AvatarFallback className="text-xl">
											{initials}
										</AvatarFallback>
									</Avatar>
									<div className="flex flex-col gap-2">
										<input
											ref={fileInputRef}
											type="file"
											accept="image/*"
											className="hidden"
											onChange={handleAvatarFileChange}
										/>
										<Button
											type="button"
											variant="outline"
											size="sm"
											onClick={() => fileInputRef.current?.click()}
										>
											<Camera className="mr-1.5 h-3.5 w-3.5" />
											Choose image
										</Button>
										{user?.avatarUrl && !avatarFile && (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleRemoveAvatar}
												disabled={removeAvatarLoading}
												className="text-destructive hover:text-destructive"
											>
												{removeAvatarLoading ? (
													<Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
												) : (
													<Trash2 className="mr-1.5 h-3 w-3" />
												)}
												Remove
											</Button>
										)}
										{avatarFile && (
											<Button
												type="button"
												size="sm"
												onClick={handleAvatarUpload}
												disabled={avatarLoading}
											>
												{avatarLoading && (
													<Loader2 className="mr-2 h-3 w-3 animate-spin" />
												)}
												Upload
											</Button>
										)}
									</div>
								</div>
								<StatusMessage status={avatarStatus} />
								<p className="text-xs text-muted-foreground">
									JPG, PNG, GIF or WebP. Max 2 MB.
								</p>
							</div>
						)}

						{/* Account tab */}
						{activeTab === "account" && (
							<div className="space-y-6">
								<div>
									<h2 className="text-base font-semibold">Account</h2>
									<p className="text-sm text-muted-foreground">
										Update your email and password.
									</p>
								</div>

								<form onSubmit={handleEmailChange} className="space-y-3">
									<h3 className="text-sm font-medium">Change Email</h3>
									<p className="text-xs text-muted-foreground">
										Current: {user?.email}
									</p>
									<div className="space-y-1.5">
										<Label htmlFor="new-email">New email address</Label>
										<Input
											id="new-email"
											type="email"
											placeholder="you@example.com"
											value={newEmail}
											onChange={(e) => setNewEmail(e.target.value)}
											required
										/>
									</div>
									<Button
										type="submit"
										size="sm"
										disabled={emailLoading || !newEmail.trim()}
									>
										{emailLoading && (
											<Loader2 className="mr-2 h-3 w-3 animate-spin" />
										)}
										Update Email
									</Button>
									<StatusMessage status={emailStatus} />
								</form>

								<div className="border-t pt-6">
									<form onSubmit={handlePasswordChange} className="space-y-3">
										<h3 className="text-sm font-medium">Change Password</h3>
										<div className="space-y-1.5">
											<Label htmlFor="new-password">New password</Label>
											<Input
												id="new-password"
												type="password"
												placeholder="Min. 8 characters"
												value={newPassword}
												onChange={(e) => setNewPassword(e.target.value)}
												required
												minLength={8}
											/>
										</div>
										<div className="space-y-1.5">
											<Label htmlFor="confirm-password">Confirm password</Label>
											<Input
												id="confirm-password"
												type="password"
												placeholder="Repeat new password"
												value={confirmPassword}
												onChange={(e) => setConfirmPassword(e.target.value)}
												required
											/>
										</div>
										<Button
											type="submit"
											size="sm"
											disabled={
												passwordLoading || !newPassword || !confirmPassword
											}
										>
											{passwordLoading && (
												<Loader2 className="mr-2 h-3 w-3 animate-spin" />
											)}
											Update Password
										</Button>
										<StatusMessage status={passwordStatus} />
									</form>
								</div>
							</div>
						)}

						{/* Workspace tab */}
						{activeTab === "workspace" && (
							<div className="space-y-5">
								<WorkspaceCustomizationPanel />
							</div>
						)}

						{/* Connected Accounts tab */}
						{activeTab === "connected" && (
							<div className="space-y-5">
								<div>
									<h2 className="text-base font-semibold">
										Connected Accounts
									</h2>
									<p className="text-sm text-muted-foreground">
										Link external accounts for quick sign-in.
									</p>
								</div>

								{identitiesLoading ? (
									<div className="flex items-center gap-2 text-sm text-muted-foreground">
										<Loader2 className="h-4 w-4 animate-spin" />
										Loading...
									</div>
								) : (
									<div className="flex items-center justify-between rounded-lg border p-4">
										<div className="flex items-center gap-3">
											<svg
												className="h-5 w-5 shrink-0"
												viewBox="0 0 24 24"
												xmlns="http://www.w3.org/2000/svg"
											>
												<path
													d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
													fill="#4285F4"
												/>
												<path
													d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
													fill="#34A853"
												/>
												<path
													d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
													fill="#FBBC05"
												/>
												<path
													d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
													fill="#EA4335"
												/>
											</svg>
											<div>
												<p className="text-sm font-medium">Google</p>
												<p className="text-xs text-muted-foreground">
													{googleIdentityId
														? (googleEmail ?? "Connected")
														: "Not connected"}
												</p>
											</div>
										</div>

										{googleIdentityId ? (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleUnlinkGoogle}
												disabled={googleActionLoading}
												className="text-destructive hover:text-destructive"
											>
												{googleActionLoading ? (
													<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
												) : (
													<Link2Off className="mr-1.5 h-3.5 w-3.5" />
												)}
												Disconnect
											</Button>
										) : (
											<Button
												type="button"
												variant="outline"
												size="sm"
												onClick={handleLinkGoogle}
												disabled={googleActionLoading}
											>
												{googleActionLoading ? (
													<Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
												) : (
													<Link2 className="mr-1.5 h-3.5 w-3.5" />
												)}
												Connect
											</Button>
										)}
									</div>
								)}
								<StatusMessage status={googleStatus} />
							</div>
						)}

						{/* Plan & Billing tab */}
						{activeTab === "billing" && (
							<div className="space-y-5">
								<div>
									<h2 className="text-base font-semibold">Plan & Billing</h2>
									<p className="text-sm text-muted-foreground">
										Manage your subscription and payment details.
									</p>
								</div>
								<BillingSection />
							</div>
						)}

						{/* Invite Friends / Referrals tab */}
						{activeTab === "referrals" && (
							<div className="space-y-5">
								<div>
									<h2 className="text-base font-semibold">Invite Friends</h2>
									<p className="text-sm text-muted-foreground">
										Share your personal code and grow the Buobu community.
									</p>
								</div>
								<ReferralSection />
							</div>
						)}

						{/* MCP & API Keys tab */}
						{activeTab === "mcp" && (
							<div className="space-y-5">
								<div>
									<h2 className="text-base font-semibold">MCP & API Keys</h2>
									<p className="text-sm text-muted-foreground">
										Connect AI tools via the Model Context Protocol.
									</p>
								</div>
								{!isPlus ? (
									<div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/40 px-6 py-8 text-center">
										<Lock className="h-8 w-8 text-muted-foreground" />
										<div className="space-y-1">
											<p className="font-semibold">Plus feature</p>
											<p className="text-sm text-muted-foreground">
												MCP integration and API keys are available on{" "}
												<span className="font-semibold text-foreground">
													Buobu Plus
												</span>
												. Upgrade to connect AI tools and access your data via
												the Model Context Protocol.
											</p>
										</div>
										<Button
											size="sm"
											className="gap-2"
											onClick={() => startCheckout(YEARLY_PRICE_ID)}
										>
											<Sparkles className="h-4 w-4" />
											Upgrade to Plus
										</Button>
									</div>
								) : user?.id ? (
									<ApiKeysManager userId={user.id} />
								) : null}
							</div>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}

function StatusMessage({ status }: { status: FieldStatus }) {
	if (!status) return null;
	return (
		<p
			className={cn(
				"flex items-center gap-1.5 text-xs",
				status.type === "success"
					? "text-green-600 dark:text-green-400"
					: "text-destructive",
			)}
		>
			{status.type === "success" ? (
				<CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
			) : (
				<AlertCircle className="h-3.5 w-3.5 shrink-0" />
			)}
			{status.message}
		</p>
	);
}
