import { Ionicons } from "@expo/vector-icons";
import { useThemeColor } from "heroui-native";

type IoniconName = keyof typeof Ionicons.glyphMap;

interface IconProps {
  name: IoniconName;
  size?: number;
  className?: string;
}

export const Icon = ({ name, size = 20 }: IconProps) => {
  const color = useThemeColor("foreground");

  return <Ionicons name={name} size={size} color={color} />;
};

export const IconMuted = ({
  name,
  size = 20,
}: {
  name: IoniconName;
  size?: number;
}) => {
  const color = useThemeColor("muted");

  return <Ionicons name={name} size={size} color={color} />;
};

export const IconDanger = ({
  name,
  size = 20,
  className,
}: {
  name: IoniconName;
  size?: number;
  className?: string;
}) => {
  const color = useThemeColor("danger");

  return (
    <Ionicons name={name} size={size} color={color} className={className} />
  );
};

export const IconAccent = ({
  name,
  size = 20,
  className,
}: {
  name: IoniconName;
  size?: number;
  className?: string;
}) => {
  const color = useThemeColor("accent");

  return (
    <Ionicons name={name} size={size} color={color} className={className} />
  );
};

export const ICON_MAP: Record<string, IoniconName> = {
  add: "add",
  alert: "alert-circle-outline",
  battery: "battery-full",
  box: "cube-outline",
  browser: "globe-outline",
  calendar: "calendar-outline",
  camera: "camera",
  checkCircle: "checkmark-circle",
  checkmark: "checkmark",
  chevronLeft: "chevron-back",
  chevronRight: "chevron-forward",
  clock: "time-outline",
  close: "close",
  cog: "cog-outline",
  download: "download-outline",
  drag: "menu",
  edit: "create-outline",
  eye: "eye",
  eyeOff: "eye-off-outline",
  flash: "flash",
  grid: "grid",
  heart: "heart",
  heartOutline: "heart-outline",
  help: "help-circle-outline",
  home: "home",
  informationCircle: "information-circle-outline",
  link: "link-outline",
  list: "list",
  location: "location-outline",
  mail: "mail-outline",
  messages: "chatbubble-outline",
  moreHorizontal: "ellipsis-horizontal",
  music: "musical-notes",
  open: "open-outline",
  pause: "pause",
  pencil: "pencil",
  phone: "call",
  pin: "pin",
  pinOutline: "pin-outline",
  pinSharp: "pin",
  play: "play",
  question: "help-circle",
  search: "search",
  settings: "settings-outline",
  share: "share-outline",
  skipBack: "play-skip-back",
  skipForward: "play-skip-forward",
  star: "star",
  starOutline: "star-outline",
  starSharp: "star",
  tag: "pricetag-outline",
  tasks: "checkbox-outline",
  trash: "trash-outline",
  wallpaper: "image-outline",
  warning: "warning-outline",
  weather: "sunny",
};

export type IconName = keyof typeof ICON_MAP;
