import { FireIcon, SnowflakeIcon, ForkKnifeIcon } from "@phosphor-icons/react";
import { Group, Paper, SimpleGrid, Text, ThemeIcon } from "@mantine/core";
import classes from "./StatsGridIcons.module.css";

export type UserOrderStat = {
  title: string;
  value: number;
  description: string;
  tone: "hot" | "cold" | "food";
};

type StatsGridIconsProps = {
  stats: UserOrderStat[];
};

const toneStyles: Record<
  UserOrderStat["tone"],
  { color: string; icon: React.ComponentType<{ size?: number }> }
> = {
  hot: {
    color: "var(--mantine-color-red-6)",
    icon: FireIcon,
  },
  cold: {
    color: "var(--mantine-color-blue-6)",
    icon: SnowflakeIcon,
  },
  food: {
    color: "var(--mantine-color-orange-6)",
    icon: ForkKnifeIcon,
  },
};

export function StatsGridIcons({ stats }: StatsGridIconsProps) {
  const cards = stats.map((stat) => {
    const style = toneStyles[stat.tone];
    const Icon = style.icon;

    return (
      <Paper withBorder p="md" radius="md" key={stat.title}>
        <Group justify="apart">
          <div>
            <Text
              c="dimmed"
              tt="uppercase"
              fw={700}
              fz="xs"
              className={classes.label}
            >
              {stat.title}
            </Text>
            <Text fw={700} fz="xl">
              {stat.value}
            </Text>
          </div>
          <ThemeIcon
            color="gray"
            variant="light"
            style={{ color: style.color }}
            size={38}
            radius="md"
          >
            <Icon size={24} />
          </ThemeIcon>
        </Group>
        <Text c="dimmed" fz="sm" mt="md">
          {stat.description}
        </Text>
      </Paper>
    );
  });

  return (
    <div className={classes.root}>
      <SimpleGrid cols={{ base: 1, sm: 3 }}>{cards}</SimpleGrid>
    </div>
  );
}
