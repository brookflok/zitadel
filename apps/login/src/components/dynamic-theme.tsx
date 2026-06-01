"use client";

import { useResponsiveLayout } from "@/lib/theme-hooks";
import { BrandingSettings } from "@zitadel/proto/zitadel/settings/v2/branding_settings_pb";
import React, { Children, ReactNode } from "react";
import { Card } from "./card";
import { ThemeWrapper } from "./theme-wrapper";

const HANKEN = { fontFamily: "var(--font-hanken-grotesk), sans-serif" } as const;

/**
 * YTŠkola layout:
 * - side-by-side: left panel is fixed ytskola marketing (solid red, white logo,
 *   hero copy, copyright). Right panel is white and holds the form. Page
 *   children: first = title block, second = form.
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
  const ytskolaLogoWhite = `${basePath}/ytskola-white-logo.png`;

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
              <div className="relative mx-auto w-full max-w-[1360px] px-4 py-4 md:px-8">
                <div className="overflow-hidden rounded-[12px] border border-[#8D8D8D] bg-white">
                  <div className="grid min-h-[520px] grid-cols-1 lg:grid-cols-2">
                    {/* Left: ytskola marketing panel */}
                    <div className="hidden bg-[#EF0000] text-white lg:flex">
                      <div
                        className="flex w-full flex-col items-center gap-[60px] px-[80px] py-[112px] text-center"
                        style={HANKEN}
                      >
                        <div className="flex w-full flex-col items-center gap-[40px]">
                          <img
                            src={ytskolaLogoWhite}
                            alt="YT Škola"
                            className="h-auto w-auto max-w-[160px]"
                          />
                          <h1
                            className="text-[48px] font-bold leading-none text-white"
                            style={HANKEN}
                          >
                            Dobrodošli u
                            <br />
                            YouTube školu!{" "}
                            <span role="img" aria-label="pozdrav">
                              👋
                            </span>
                          </h1>
                        </div>
                        <p
                          className="text-[18px] font-medium leading-none text-white"
                          style={HANKEN}
                        >
                          Za pristup materijalima kursa, prijavite se na svoj račun.
                        </p>
                        <p className="text-[18px] leading-none text-white" style={HANKEN}>
                          Copyright c 2020-{new Date().getFullYear()} relativno LLC
                        </p>
                      </div>
                    </div>

                    {/* Right: page title + form */}
                    <div className="flex items-center justify-center bg-white p-6 lg:p-10">
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
                </div>
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
