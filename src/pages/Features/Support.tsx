import React from "react";
import { useTranslation } from "react-i18next";
import { LifeBuoy, MessageCircle, BookOpen, Mail, Clock } from "lucide-react";
import FeaturePageLayout, { FeatureCard } from "./FeaturePageLayout";

const Support: React.FC = () => {
  const { t } = useTranslation("pages");

  return (
    <FeaturePageLayout
      icon={<LifeBuoy size={26} />}
      eyebrow={t("fp_eyebrow")}
      title={t("fpsup_title")}
      subtitle={t("fpsup_subtitle")}
      cta={{ label: t("fpsup_cta"), to: "/contact" }}
    >
      <FeatureCard icon={<BookOpen size={20} />} title={t("fpsup_c1_title")} description={t("fpsup_c1_desc")} />
      <FeatureCard icon={<Mail size={20} />} title={t("fpsup_c2_title")} description={t("fpsup_c2_desc")} />
      <FeatureCard icon={<MessageCircle size={20} />} title={t("fpsup_c3_title")} description={t("fpsup_c3_desc")} />
      <FeatureCard icon={<Clock size={20} />} title={t("fpsup_c4_title")} description={t("fpsup_c4_desc")} />
    </FeaturePageLayout>
  );
};

export default Support;
