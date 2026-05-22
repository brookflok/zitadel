"use client";

import { useResponsiveLayout } from "@/lib/theme-hooks";
import { BrandingSettings } from "@zitadel/proto/zitadel/settings/v2/branding_settings_pb";
import React, { Children, ReactNode } from "react";
import { Card } from "./card";
import { ThemeWrapper } from "./theme-wrapper";

/**
 * YTŠkola layout:
 * - side-by-side: left panel is fixed ytskola marketing (purple bg, white logo, hero
 *   copy, copyright). Right panel stacks the page-specific title block on top of the
 *   form. Page children: first = title block, second = form.
 * - top-to-bottom: original upstream behavior, just swapping the upstream branding logo
 *   for the ytskola logo.
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
  const logoWhite = `${basePath}/ytskola-logo-white.png`;
  const logoColor = `${basePath}/ytskola-logo.png`;

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
                <Card>
                  <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-2">
                    {/* Left: ytskola marketing panel */}
                    <div className="relative hidden overflow-hidden bg-[#3a2466] text-white lg:flex">
                      <div className="flex w-full flex-col justify-between p-10">
                        <img
                          src={logoWhite}
                          alt="YT Škola"
                          className="h-10 w-auto"
                        />
                        <div className="max-w-xl space-y-6">
                          <h1 className="text-4xl font-extrabold leading-tight xl:text-5xl">
                            Dobrodošli u SEOLAXY Kurs!{" "}
                            <span role="img" aria-label="pozdrav">
                              👋
                            </span>
                          </h1>
                          <p className="text-lg text-indigo-100">
                            Prijavite se na svoj račun za pristup materijalima kursa.
                          </p>
                        </div>
                        <div className="text-sm text-indigo-100/80">
                          Copyright © 2020–{new Date().getFullYear()} SEOLAXY®
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
                        src={logoColor}
                        alt="YT Škola"
                        className="h-12 w-auto"
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
