"use client";
import { useState } from "react";
import {
  ChefHatIcon,
  CoffeeIcon,
  TruckIcon,
  CheckCircleIcon,
  ChecksIcon,
} from "@phosphor-icons/react";
import { Stepper } from "@mantine/core";

export default function TrackOrderClientPage() {
  const [active, setActive] = useState(2);
  const [isDelivered, setIsDelivered] = useState(false);

  const deliveryState = isDelivered
    ? {
        icon: <TruckIcon />,
        description: "Delivered",
      }
    : {
        icon: <CoffeeIcon />,
        description: "Out for delivery",
      };

  return (
    <Stepper
      active={active}
      onStepClick={setActive}
      completedIcon={<CheckCircleIcon size={18} />}
      allowNextStepsSelect={false}
    >
      <Stepper.Step
        icon={<ChecksIcon size={18} />}
        label="Confirm Order"
        description="Double check orders"
      />
      <Stepper.Step
        icon={<ChefHatIcon size={18} />}
        label="Preparing"
        description="Brewing & Cooking"
      />
      <Stepper.Step
        icon={deliveryState.icon}
        label="Step 3"
        description={deliveryState.description}
      />
    </Stepper>
  );
}
