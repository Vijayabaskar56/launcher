import { use, useCallback } from "react";
import { ScrollView } from "react-native";

import { PreferenceCategory } from "@/components/settings/preference-category";
import { SelectPreference } from "@/components/settings/select-preference";
import { SwitchPreference } from "@/components/settings/switch-preference";
import { SettingsContext } from "@/context/settings";
import type { IconShape } from "@/types/settings";

export default function IconsSettings() {
  const settings = use(SettingsContext);

  const handleIconShape = useCallback(
    (v: IconShape) => {
      settings?.actions.updateIcons({ iconShape: v });
    },
    [settings]
  );
  const handleShowLabels = useCallback(
    (v: boolean) => {
      settings?.actions.updateIcons({ showLabels: v });
    },
    [settings]
  );
  const handleThemedIcons = useCallback(
    (v: boolean) => {
      settings?.actions.updateIcons({ themedIcons: v });
    },
    [settings]
  );
  const handleForceThemedIcons = useCallback(
    (v: boolean) => {
      settings?.actions.updateIcons({ forceThemedIcons: v });
    },
    [settings]
  );
  const handleAdaptify = useCallback(
    (v: boolean) => {
      settings?.actions.updateIcons({ adaptify: v });
    },
    [settings]
  );

  if (!settings) {
    return null;
  }

  const { state } = settings;
  const { icons } = state;

  return (
    <ScrollView
      className="flex-1 bg-background"
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{ gap: 20, paddingBottom: 40, paddingTop: 8 }}
    >
      <PreferenceCategory title="Icon Shape">
        <SelectPreference
          icon="crop-square"
          title="Shape"
          summary="Choose the shape of app icons"
          value={icons.iconShape}
          options={[
            { label: "Circle", value: "circle" as IconShape },
            { label: "Square", value: "square" as IconShape },
            { label: "Rounded", value: "rounded-square" as IconShape },
            { label: "Squircle", value: "squircle" as IconShape },
            { label: "Teardrop", value: "teardrop" as IconShape },
            { label: "Hexagon", value: "hexagon" as IconShape },
          ]}
          onValueChange={handleIconShape}
        />
        <SwitchPreference
          icon="label"
          title="Show Labels"
          summary="Display app names below icons"
          value={icons.showLabels}
          onValueChange={handleShowLabels}
        />
      </PreferenceCategory>

      <PreferenceCategory title="Themed Icons">
        <SwitchPreference
          icon="color-lens"
          title="Themed Icons"
          summary="Requires native module (coming soon)"
          value={icons.themedIcons}
          onValueChange={handleThemedIcons}
          disabled
        />
        <SwitchPreference
          title="Force Themed Icons"
          summary="Requires native module (coming soon)"
          value={icons.forceThemedIcons}
          onValueChange={handleForceThemedIcons}
          disabled
        />
      </PreferenceCategory>

      <PreferenceCategory title="Advanced">
        <SwitchPreference
          icon="auto-fix-high"
          title="Adaptify"
          summary="Requires native module (coming soon)"
          value={icons.adaptify}
          onValueChange={handleAdaptify}
          disabled
        />
      </PreferenceCategory>
    </ScrollView>
  );
}
