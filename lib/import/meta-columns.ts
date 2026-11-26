import type { TargetField } from "./fields";

/**
 * Meta Ads Manager column names (English and Arabic exports) for each field.
 * Matching is done after normalizeHeader(), so case, extra spaces, Arabic
 * letter variants (أ/إ/آ, ة/ه, ى/ي) and a currency suffix like "(SAR)" do not
 * matter. Add new names here when Meta renames a column.
 */
export const META_COLUMNS: Record<TargetField, string[]> = {
  date: ["Reporting starts", "Day", "Date", "Reporting start", "بدء إعداد التقارير", "بداية إعداد التقارير", "اليوم", "التاريخ"],
  date_end: ["Reporting ends", "Reporting end", "انتهاء إعداد التقارير", "نهاية إعداد التقارير"],
  campaign_name: ["Campaign name", "Campaign", "اسم الحملة", "الحملة"],
  campaign_external_id: ["Campaign ID", "معرف الحملة", "رقم الحملة"],
  adset_name: ["Ad set name", "Ad Set Name", "Ad set", "اسم المجموعة الإعلانية", "المجموعة الإعلانية", "اسم مجموعة الإعلانات"],
  adset_external_id: ["Ad set ID", "معرف المجموعة الإعلانية", "معرف مجموعة الإعلانات"],
  ad_name: ["Ad name", "Ad", "اسم الإعلان", "الإعلان"],
  ad_external_id: ["Ad ID", "معرف الإعلان"],
  spend: ["Amount spent", "Amount spent (SAR)", "Spend", "Cost", "المبلغ الذي تم إنفاقه", "المبلغ المنفق", "الإنفاق", "المبلغ الذي تم صرفه"],
  impressions: ["Impressions", "مرات الظهور", "الظهور"],
  reach: ["Reach", "الوصول", "مدى الوصول"],
  frequency: ["Frequency", "معدل التكرار", "التكرار"],
  clicks: ["Clicks (all)", "Clicks", "النقرات (الكل)", "النقرات (جميعها)", "النقرات"],
  link_clicks: ["Link clicks", "النقرات على الرابط", "نقرات الرابط"],
  ctr: ["CTR (link click-through rate)", "CTR (all)", "CTR", "نسبة النقر إلى الظهور (معدل النقر على الرابط)", "نسبة النقر إلى الظهور (الكل)", "نسبة النقر إلى الظهور"],
  cpc: ["CPC (cost per link click)", "CPC (all)", "CPC", "تكلفة النقرة (تكلفة النقرة على الرابط)", "تكلفة النقرة (الكل)", "تكلفة النقرة"],
  cpm: ["CPM (cost per 1,000 impressions)", "CPM", "التكلفة لكل 1000 مرة ظهور", "التكلفة لكل 1,000 مرة ظهور", "تكلفة الألف ظهور"],
  results: ["Results", "النتائج"],
  result_type: ["Result indicator", "Result type", "مؤشر النتائج", "مؤشر النتيجة", "نوع النتيجة"],
  cost_per_result: ["Cost per result", "Cost per results", "التكلفة لكل نتيجة", "تكلفة النتيجة"],
  leads: ["Leads", "Meta leads", "Leads (form)", "On-Facebook leads", "العملاء المحتملون", "عملاء محتملون", "العملاء المحتملون على Meta"],
  messages: [
    "Messaging conversations started",
    "Messaging contacts",
    "New messaging contacts",
    "محادثات المراسلة التي بدأت",
    "المحادثات التي بدأت",
    "جهات اتصال المراسلة",
  ],
  purchases: ["Purchases", "Website purchases", "عمليات الشراء", "المشتريات", "عمليات الشراء على الموقع"],
  purchase_value: ["Purchases conversion value", "Purchase conversion value", "Website purchases conversion value", "قيمة تحويل عمليات الشراء", "قيمة التحويل لعمليات الشراء"],
  roas: ["Purchase ROAS (return on ad spend)", "Purchase ROAS", "ROAS", "Website purchase ROAS (return on ad spend)", "العائد على الإنفاق الإعلاني لعمليات الشراء", "العائد على الإنفاق الإعلاني"],
  video_views: ["Video plays", "Video views", "تشغيلات الفيديو", "مشاهدات الفيديو"],
  video_3s_views: ["3-second video plays", "3-Second video plays", "تشغيلات الفيديو لمدة 3 ثوانٍ", "تشغيل الفيديو لمدة 3 ثوان", "مشاهدات الفيديو لمدة 3 ثوانٍ"],
  thruplay: ["ThruPlays", "ThruPlay", "مرات التشغيل حتى النهاية", "ThruPlay (مرات التشغيل)"],
  engagement: ["Post engagement", "Post engagements", "Engagement", "التفاعل مع المنشور", "التفاعلات مع المنشور", "التفاعل"],
};
