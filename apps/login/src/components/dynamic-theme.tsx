"use client";

import { useResponsiveLayout } from "@/lib/theme-hooks";
import { BrandingSettings } from "@zitadel/proto/zitadel/settings/v2/branding_settings_pb";
import React, { Children, ReactNode } from "react";
import { Card } from "./card";
import { ThemeWrapper } from "./theme-wrapper";

/**
 * YTŠkola layout:
 * - side-by-side: left panel is fixed ytskola marketing (red bg, color logo, hero
 *   copy, copyright). Right panel stacks the page-specific title block on top of
 *   the form. Page children: first = title block, second = form.
 * - top-to-bottom: original upstream behavior with the ytskola color logo.
 */
export function DynamicTheme({
  branding,
  children,
}: {
  children: ReactNode | ((isSideBySide: boolean) => ReactNode);
  branding?: BrandingSettings;
}) {
  const { isSideBySide } = useResponsiveLayout();
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  const ytskolaLogo = `${basePath}/ytskola-logo.png`;

  const actualChildren: ReactNode = React.useMemo(() => {
    if (typeof children === "function") {
      return (children as (isSideBySide: boolean) => ReactNode)(isSideBySide);
    }
    return children;
  }, [children, isSideBySide]);

  return (
    <ThemeWrapper branding={branding}>
      {isSideBySide
        ? (() => {
            const childArray = Children.toArray(actualChildren);
            const titleBlock = childArray[0] ?? null;
            const formBlock = childArray[1] ?? null;
            const hasTitleAndForm = childArray.length === 2;

            return (
              <div className="relative mx-auto w-full max-w-[1100px] px-4 py-4 md:px-8">
                <Card padding="">
                  <div className="grid min-h-[520px] grid-cols-1 overflow-hidden lg:grid-cols-2">
                    {/* Left: ytskola marketing panel */}
                    <div className="relative hidden overflow-hidden bg-[linear-gradient(to_bottom,#FFB3C1_0%,#E63946_50%,#8B0000_100%)] text-white lg:flex">
                      <div className="flex w-full flex-col justify-between p-10">
                        <img
                          src={ytskolaLogo}
                          alt="YT Škola"
                          className="h-auto w-auto max-w-[240px]"
                        />
                        <div className="max-w-xl space-y-6">
                          <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">
                            Dobrodošli u Youtube Školu{" "}
                            <span role="img" aria-label="pozdrav">
                              👋
                            </span>
                          </h1>
                          <p className="text-lg text-white/90">
                            Prijavite se na svoj račun za pristup materijalima kursa.
                          </p>
                        </div>
                        <div className="text-sm text-white/80">
                          Copyright © 2020–{new Date().getFullYear()} Relativno LLC
                        </div>
                      </div>
                    </div>

                    {/* Right: page title + form */}
                    <div className="flex items-center justify-center p-6 lg:p-10">
                      <div className="w-full max-w-[440px] space-y-6">
                        {hasTitleAndForm ? (
                          <>
                            <div>{titleBlock}</div>
                            <div className="w-full">{formBlock}</div>
                          </>
                        ) : (
                          <div className="w-full">{actualChildren}</div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })()
        : (() => {
            const childArray = Children.toArray(actualChildren);
            const titleContent = childArray[0] ?? null;
            const formContent = childArray[1] ?? null;
            const hasMultipleChildren = childArray.length > 1;

            return (
              <div className="relative mx-auto w-full max-w-[440px] px-4 py-4">
                <Card>
                  <div className="mx-auto flex flex-col items-center space-y-8">
                    <div className="relative -mb-4 flex flex-row items-center justify-center">
                      <img
                        src={ytskolaLogo}
                        alt="YT Škola"
                        className="h-auto w-auto max-w-[240px]"
                      />
                    </div>

                    {hasMultipleChildren ? (
                      <>
                        <div className="mb-4 flex w-full flex-col items-center text-center">
                          {titleContent}
                        </div>
                        <div className="w-full">{formContent}</div>
                      </>
                    ) : (
                      <div className="w-full">{actualChildren}</div>
                    )}
                  </div>
                </Card>
              </div>
            );
          })()}
    </ThemeWrapper>
  );
}
