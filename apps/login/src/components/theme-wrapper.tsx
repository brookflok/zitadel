"use client";

import { setTheme } from "@/helpers/colors";
import { BrandingSettings } from "@zitadel/proto/zitadel/settings/v2/branding_settings_pb";
import { useTheme } from "next-themes";
import { ReactNode, useEffect } from "react";

type Props = {
  branding: BrandingSettings | undefined;
  children: ReactNode;
};

// YTŠkola: ignore the Zitadel-admin primary/warn colors and force the brand red.
const YTSKOLA_PRIMARY = "#ef0000";

function withYtskolaBrand(policy: BrandingSettings | undefined): BrandingSettings {
  const base = (policy ?? {}) as BrandingSettings;
  return {
    ...base,
    lightTheme: {
      ...(base.lightTheme ?? {}),
      primaryColor: YTSKOLA_PRIMARY,
    },
    darkTheme: {
      ...(base.darkTheme ?? {}),
      primaryColor: YTSKOLA_PRIMARY,
    },
  } as BrandingSettings;
}

export const ThemeWrapper = ({ children, branding }: Props) => {
  const { setTheme: setNextTheme } = useTheme();

  useEffect(() => {
    setTheme(document, withYtskolaBrand(branding));
  }, [branding]);

  // Handle branding themeMode to force specific theme
  useEffect(() => {
    if (branding?.themeMode !== undefined) {
      // Based on the proto definition:
      // THEME_MODE_UNSPECIFIED = 0
      // THEME_MODE_AUTO = 1
      // THEME_MODE_LIGHT = 2
      // THEME_MODE_DARK = 3
      switch (branding.themeMode) {
        case 2: // THEME_MODE_LIGHT
          setNextTheme("light");
          break;
        case 3: // THEME_MODE_DARK
          setNextTheme("dark");
          break;
        case 1: // THEME_MODE_AUTO
        case 0: // THEME_MODE_UNSPECIFIED
        default:
          setNextTheme("system");
          break;
      }
    }
  }, [branding?.themeMode, setNextTheme]);

  return <div>{children}</div>;
};
