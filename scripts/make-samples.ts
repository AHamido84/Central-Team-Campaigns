/**
 * Generates samples/meta-export-sample-ar.csv and -en.csv: realistic Meta Ads
 * Manager exports (ad level, Day breakdown) that match the seeded campaigns,
 * plus one campaign that does not exist yet (to test auto-create).
 */
import fs from "node:fs";

let s = 42;
const rnd = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
const days = Array.from({ length: 7 }, (_, i) => `2026-11-${String(16 + i).padStart(2, "0")}`);
const fmt = (n: number, d = 2) => n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d });

type Ad = { campaign: string; adset: string; ad: string; budget: number; leads: boolean };
function rows(ads: Ad[]) {
  const out: (string | number)[][] = [];
  for (const d of days)
    for (const a of ads) {
      const spend = a.budget * (0.75 + rnd() * 0.5);
      const cpm = 18 + rnd() * 14;
      const impressions = Math.round((spend / cpm) * 1000);
      const reach = Math.round(impressions / (1.2 + rnd() * 0.8));
      const linkClicks = Math.round(impressions * (0.006 + rnd() * 0.012));
      const clicks = Math.round(linkClicks * 1.6);
      const results = Math.max(0, Math.round(linkClicks * (0.05 + rnd() * 0.12)));
      const v3 = Math.round(impressions * (0.2 + rnd() * 0.15));
      const thru = Math.round(v3 * (0.15 + rnd() * 0.15));
      out.push([a.campaign, a.adset, a.ad, d, d, fmt(spend), fmt(impressions, 0), fmt(reach, 0), (impressions / reach).toFixed(2), fmt(clicks, 0), fmt(linkClicks, 0), ((linkClicks / impressions) * 100).toFixed(2), fmt(cpm), results, a.leads ? "actions:onsite_conversion.lead_grouped" : "actions:onsite_conversion.messaging_conversation_started_7d", results ? fmt(spend / results) : "", a.leads ? results : 0, fmt(v3, 0), fmt(thru, 0)]);
    }
  return out;
}
const csv = (headers: string[], data: (string | number)[][], total: (string | number)[]) =>
  "﻿" + [headers, ...data, total].map((r) => r.map((c) => (/[",\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(",")).join("\n") + "\n";

const AR_HEADERS = ["اسم الحملة", "اسم المجموعة الإعلانية", "اسم الإعلان", "بدء إعداد التقارير", "انتهاء إعداد التقارير", "المبلغ الذي تم إنفاقه (SAR)", "مرات الظهور", "الوصول", "معدل التكرار", "النقرات (الكل)", "النقرات على الرابط", "نسبة النقر إلى الظهور (معدل النقر على الرابط)", "التكلفة لكل 1000 مرة ظهور", "النتائج", "مؤشر النتائج", "التكلفة لكل نتيجة", "العملاء المحتملون", "تشغيلات الفيديو لمدة 3 ثوانٍ", "مرات التشغيل حتى النهاية"];
const EN_HEADERS = ["Campaign name", "Ad set name", "Ad name", "Reporting starts", "Reporting ends", "Amount spent (SAR)", "Impressions", "Reach", "Frequency", "Clicks (all)", "Link clicks", "CTR (link click-through rate)", "CPM (cost per 1,000 impressions)", "Results", "Result indicator", "Cost per result", "Leads", "3-second video plays", "ThruPlays"];

const ar = rows([
  { campaign: "مشروع الياسمين - عملاء محتملون", adset: "اهتمامات - 25-45", ad: "مشروع الياسمين - عملاء محتملون | فيديو 9:16", budget: 520, leads: true },
  { campaign: "مشروع الياسمين - عملاء محتملون", adset: "إعادة استهداف", ad: "مشروع الياسمين - عملاء محتملون | صورة 1:1", budget: 360, leads: true },
  { campaign: "إطلاق برج النخيل", adset: "مهتمون بالاستثمار العقاري", ad: "برج النخيل - كاروسيل", budget: 400, leads: true },
  { campaign: "إطلاق برج النخيل", adset: "مهتمون بالاستثمار العقاري", ad: "برج النخيل - ريلز", budget: 300, leads: true },
]);
const en = rows([
  { campaign: "تبييض الأسنان - حجوزات", adset: "اهتمامات - 25-45", ad: "تبييض الأسنان - حجوزات | فيديو 9:16", budget: 420, leads: true },
  { campaign: "تبييض الأسنان - حجوزات", adset: "إعادة استهداف", ad: "تبييض الأسنان - حجوزات | صورة 1:1", budget: 280, leads: true },
  { campaign: "Ramadan Offer - Leads", adset: "Women 25-44 Riyadh", ad: "Ramadan UGC", budget: 350, leads: true },
]);

fs.mkdirSync("samples", { recursive: true });
fs.writeFileSync("samples/meta-export-sample-ar.csv", csv(AR_HEADERS, ar, ["", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]));
fs.writeFileSync("samples/meta-export-sample-en.csv", csv(EN_HEADERS, en, ["Total", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", "", ""]));
console.log(`samples: ar ${ar.length} rows, en ${en.length} rows`);
