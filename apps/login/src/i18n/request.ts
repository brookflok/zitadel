import { getServiceConfig } from "@/lib/service-url";
import { getHostedLoginTranslation } from "@/lib/zitadel";
import { JsonObject } from "@zitadel/client";
import deepmerge from "deepmerge";
import { getRequestConfig } from "next-intl/server";
import { headers } from "next/headers";

// YTŠkola: locale is hard-pinned to Croatian. Any Zitadel-admin "allowed languages"
// or browser Accept-Language / NEXT_LOCALE cookie is intentionally ignored.
const FORCED_LOCALE = "hr";

export default getRequestConfig(async () => {
  const _headers = await headers();
  const { serviceConfig } = getServiceConfig(_headers);

  const i18nOrganization = _headers.get("x-zitadel-i18n-organization") || "";

  let customMessages: JsonObject | Record<string, never> = {};
  try {
    const i18nJSON = await getHostedLoginTranslation({
      serviceConfig,
      locale: FORCED_LOCALE,
      organization: i18nOrganization,
    });
    if (i18nJSON) {
      customMessages = i18nJSON;
    }
  } catch (error) {
    console.warn("Error fetching custom translations:", error);
  }

  const localeMessages = (await import(`../../locales/${FORCED_LOCALE}.json`)).default;

  return {
    locale: FORCED_LOCALE,
    messages: deepmerge.all([localeMessages, customMessages]) as Record<string, string>,
  };
});
