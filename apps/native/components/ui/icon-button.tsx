import { Button } from "heroui-native";
import type { ComponentProps, ReactNode } from "react";

type HeroButtonProps = ComponentProps<typeof Button>;

interface IconButtonProps extends Omit<
  HeroButtonProps,
  "children" | "isIconOnly"
> {
  children: ReactNode;
}

export const IconButton = ({
  children,
  variant = "ghost",
  size = "sm",
  hitSlop = 12,
  ...rest
}: IconButtonProps) => (
  <Button
    variant={variant}
    size={size}
    isIconOnly
    hitSlop={hitSlop}
    {...(rest as HeroButtonProps)}
  >
    {children}
  </Button>
);

IconButton.displayName = "IconButton";
