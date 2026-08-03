import React from "react";
import { useTranslation } from "react-i18next";
import { FileText, Download, Printer, WifiOff, Share2 } from "lucide-react";
import FeaturePageLayout, { FeatureCard } from "./FeaturePageLayout";

const PDFExport: React.FC = () => {
  const { t } = useTranslation("pages");

  return (
    <FeaturePageLayout
      icon={<FileText size={26} />}
      eyebrow={t("fp_eyebrow")}
      title={t("fppdf_title")}
      subtitle={t("fppdf_subtitle")}
      cta={{ label: t("fppdf_cta"), to: "/" }}
    >
      <FeatureCard icon={<Download size={20} />} title={t("fppdf_c1_title")} description={t("fppdf_c1_desc")} />
      <FeatureCard icon={<WifiOff size={20} />} title={t("fppdf_c2_title")} description={t("fppdf_c2_desc")} />
      <FeatureCard icon={<Printer size={20} />} title={t("fppdf_c3_title")} description={t("fppdf_c3_desc")} />
      <FeatureCard icon={<Share2 size={20} />} title={t("fppdf_c4_title")} description={t("fppdf_c4_desc")} />
    </FeaturePageLayout>
  );
};

export default PDFExport;
