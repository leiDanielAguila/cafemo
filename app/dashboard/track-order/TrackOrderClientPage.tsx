"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChefHatIcon,
  CoffeeIcon,
  TruckIcon,
  CheckCircleIcon,
  ChecksIcon,
  MapPinIcon,
  UserIcon,
} from "@phosphor-icons/react";
import { Stepper } from "@mantine/core";
import { formatPrice } from "@/app/lib/menu";
import {
  clearPendingOrderFromStorage,
  loadPendingOrderFromStorage,
  savePendingOrderToStorage,
  type PendingOrder,
} from "@/app/lib/orderFlow";
import { useUserStore } from "@/app/lib/store/useUserStore";
import { mapSupabaseUserToProfile } from "@/app/lib/userProfile";
import { createClient } from "@/app/utils/supabase/client";

const PREPARING_SECONDS = 10;
const DELIVERY_SECONDS = 10;

export default function TrackOrderClientPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [active, setActive] = useState(0);
  const [pendingOrder, setPendingOrder] = useState<PendingOrder | null>(null);
  const [prepSecondsLeft, setPrepSecondsLeft] = useState(PREPARING_SECONDS);
  const [deliverySecondsLeft, setDeliverySecondsLeft] =
    useState(DELIVERY_SECONDS);
  const [isDelivered, setIsDelivered] = useState(false);
  const [isPersistingOrder, setIsPersistingOrder] = useState(false);
  const [persistError, setPersistError] = useState<string | null>(null);
  const [persistedOrderId, setPersistedOrderId] = useState<string | null>(null);
  const hasPersistedRef = useRef(false);

  const displayName = useUserStore((state) => state.displayName);
  const address = useUserStore((state) => state.address);
  const email = useUserStore((state) => state.email);
  const setUser = useUserStore((state) => state.setUser);

  useEffect(() => {
    setPendingOrder(loadPendingOrderFromStorage());
  }, []);

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
        return;
      }

      setUser(mapSupabaseUserToProfile(data.user));
    };

    hydrateUser();
  }, [address, displayName, email, setUser, supabase]);

  useEffect(() => {
    if (active !== 1) {
      return;
    }

    const timer = window.setInterval(() => {
      setPrepSecondsLeft((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          setActive(2);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [active]);

  useEffect(() => {
    if (active !== 2 || isDelivered) {
      return;
    }

    const timer = window.setInterval(() => {
      setDeliverySecondsLeft((seconds) => {
        if (seconds <= 1) {
          window.clearInterval(timer);
          setIsDelivered(true);
          return 0;
        }

        return seconds - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [active, isDelivered]);

  useEffect(() => {
    if (!isDelivered || !pendingOrder || hasPersistedRef.current) {
      return;
    }

    hasPersistedRef.current = true;
    setIsPersistingOrder(true);
    setPersistError(null);

    const persistOrder = async () => {
      try {
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            totalAmount: pendingOrder.totalAmount,
            items: pendingOrder.items.map((item) => ({
              itemId: item.itemId,
              itemType: item.itemType,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          }),
        });

        if (!response.ok) {
          const errorData = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(errorData?.error || "Failed to save order.");
        }

        const data = (await response.json()) as { orderId?: string };
        setPersistedOrderId(data.orderId ?? null);
        clearPendingOrderFromStorage();
      } catch (error) {
        hasPersistedRef.current = false;
        setPersistError(
          error instanceof Error
            ? error.message
            : "Unknown error while saving order.",
        );
      } finally {
        setIsPersistingOrder(false);
      }
    };

    persistOrder();
  }, [isDelivered, pendingOrder]);

  const preparingProgress =
    ((PREPARING_SECONDS - prepSecondsLeft) / PREPARING_SECONDS) * 100;
  const deliveryProgress =
    ((DELIVERY_SECONDS - deliverySecondsLeft) / DELIVERY_SECONDS) * 100;

  const profileDisplayName =
    displayName.trim() || pendingOrder?.displayName || "Guest";
  const profileAddress =
    address.trim() || pendingOrder?.address || "No address set";

  const deliveryState = isDelivered
    ? {
        icon: <CheckCircleIcon size={18} />,
        description: "Delivered",
      }
    : {
        icon: <TruckIcon size={18} />,
        description: `Driver arrives in ${deliverySecondsLeft}s`,
      };

  const receiptRows = pendingOrder?.items ?? [];
  const subtotal = pendingOrder?.totalAmount ?? 0;
  const canConfirmOrder = receiptRows.length > 0;

  function handleRemoveReceiptItem(itemType: string, itemId: number) {
    if (!pendingOrder) {
      return;
    }

    const nextItems = pendingOrder.items.filter(
      (item) => !(item.itemType === itemType && item.itemId === itemId),
    );

    if (nextItems.length === 0) {
      setPendingOrder(null);
      clearPendingOrderFromStorage();
      return;
    }

    const nextTotal = Number.parseFloat(
      nextItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2),
    );

    const nextOrder: PendingOrder = {
      ...pendingOrder,
      items: nextItems,
      totalAmount: nextTotal,
    };

    setPendingOrder(nextOrder);
    savePendingOrderToStorage(nextOrder);
  }

  function handleCancelOrder() {
    setPendingOrder(null);
    clearPendingOrderFromStorage();
    setActive(0);
    setPrepSecondsLeft(PREPARING_SECONDS);
    setDeliverySecondsLeft(DELIVERY_SECONDS);
    setIsDelivered(false);
    setPersistError(null);
    setPersistedOrderId(null);
    setIsPersistingOrder(false);
    hasPersistedRef.current = false;
  }

  return (
    <div className="mx-auto w-full max-w-4xl text-left">
      <Stepper
        active={active}
        completedIcon={<CheckCircleIcon size={18} />}
        allowNextStepsSelect={false}
      >
        <Stepper.Step
          icon={<ChecksIcon size={18} />}
          label="Confirm"
          description="Review receipt"
        />
        <Stepper.Step
          icon={<ChefHatIcon size={18} />}
          label="Preparing"
          description="Kitchen is working"
        />
        <Stepper.Step
          icon={deliveryState.icon}
          label="Delivery"
          description={deliveryState.description}
        />
      </Stepper>

      <div className="mt-8 rounded-2xl bg-white/75 p-6 md:p-8">
        {active === 0 && (
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-charcoal)]">
              Order Receipt
            </h2>

            {!pendingOrder && (
              <p className="mt-4 text-sm text-[var(--color-charcoal)]/80">
                No pending order found. Please place an order from the kiosk
                first.
              </p>
            )}

            {pendingOrder && (
              <>
                <div className="mt-4 space-y-2 rounded-xl border border-[var(--border)] bg-white p-4">
                  {receiptRows.map((item) => (
                    <div
                      key={`${item.itemType}-${item.itemId}`}
                      className="flex items-center justify-between gap-4 text-sm text-[var(--color-charcoal)]"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <p className="font-medium">
                          {item.quantity} × {item.name}
                        </p>
                        <button
                          type="button"
                          onClick={() =>
                            handleRemoveReceiptItem(item.itemType, item.itemId)
                          }
                          className="rounded-md border border-[var(--border)] px-2 py-0.5 text-xs font-semibold text-[var(--color-coral)] transition hover:bg-[var(--surface)]"
                        >
                          Remove
                        </button>
                      </div>
                      <p className="shrink-0 font-semibold text-[var(--color-violet)]">
                        {formatPrice(item.lineTotal)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <p className="text-sm font-semibold text-[var(--color-charcoal)]">
                    Total Amount
                  </p>
                  <p className="text-lg font-bold text-[var(--color-violet)]">
                    {formatPrice(subtotal)}
                  </p>
                </div>

                <div className="mt-5 space-y-2 rounded-xl bg-[var(--surface)]/60 p-4 text-sm text-[var(--color-charcoal)]">
                  <p className="inline-flex items-center gap-2">
                    <UserIcon size={16} weight="duotone" />
                    {profileDisplayName}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <MapPinIcon size={16} weight="duotone" />
                    {profileAddress}
                  </p>
                </div>
              </>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => setActive(1)}
                disabled={!canConfirmOrder}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50"
                style={{ backgroundColor: "#5b5fd0" }}
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={handleCancelOrder}
                disabled={!canConfirmOrder}
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-coral)] transition hover:bg-[var(--surface)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel Order
              </button>
              <button
                type="button"
                onClick={() => router.push("/dashboard/kiosk")}
                className="rounded-xl border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-charcoal)] transition hover:bg-[var(--surface)]"
              >
                Go Back
              </button>
            </div>
          </div>
        )}

        {active === 1 && (
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-charcoal)]">
              Preparing Your Order
            </h2>
            <p className="mt-2 text-sm text-[var(--color-charcoal)]/80">
              Order is being prepared by the kitchen. ETA: {prepSecondsLeft}s
            </p>

            <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-[var(--surface)]">
              <div
                className="h-full animate-pulse rounded-full bg-[var(--color-violet)] transition-all duration-500"
                style={{
                  width: `${Math.max(preparingProgress, 4)}%`,
                }}
              />
            </div>
          </div>
        )}

        {active === 2 && (
          <div>
            <h2 className="text-xl font-semibold text-[var(--color-charcoal)]">
              Delivery Status
            </h2>
            <div className="mt-4 rounded-xl border border-[var(--border)] bg-white p-4 text-sm text-[var(--color-charcoal)]">
              <p className="font-semibold">Driver: Alex Dela Cruz</p>
              <p className="mt-1">Vehicle: CafeMo Rider #CM-17</p>
              <p className="mt-1 inline-flex items-center gap-2">
                <CoffeeIcon size={16} weight="duotone" />
                Status: {deliveryState.description}
              </p>
              <p className="mt-1 inline-flex items-center gap-2">
                <MapPinIcon size={16} weight="duotone" />
                Destination: {profileAddress}
              </p>
            </div>

            <div className="mt-6 h-3 w-full overflow-hidden rounded-full bg-[var(--surface)]">
              <div
                className="h-full rounded-full bg-[var(--color-sage)] transition-all duration-500"
                style={{ width: `${Math.max(deliveryProgress, 4)}%` }}
              />
            </div>

            {isDelivered && (
              <p className="mt-4 text-sm font-semibold text-[var(--color-violet)]">
                Order delivered to your address.
              </p>
            )}

            {isPersistingOrder && (
              <p className="mt-2 text-sm text-[var(--color-charcoal)]/80">
                Saving order to database...
              </p>
            )}

            {persistedOrderId && (
              <p className="mt-2 text-sm font-medium text-[var(--color-charcoal)]">
                Saved with Order ID: {persistedOrderId}
              </p>
            )}

            {persistError && (
              <p className="mt-2 text-sm font-medium text-[var(--color-coral)]">
                Failed to save order: {persistError}
              </p>
            )}

            <div className="mt-6">
              <button
                type="button"
                onClick={() => router.push("/dashboard/kiosk")}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white transition hover:opacity-95"
                style={{ backgroundColor: "#5b5fd0" }}
              >
                Back to Kiosk
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
