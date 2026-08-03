import React from "react";
import { useTranslation } from "react-i18next";
import { ListTodo, Sparkles, MapPin, Clock, Shuffle, Landmark } from "lucide-react";
import FeaturePageLayout, { FeatureCard } from "./FeaturePageLayout";

const ItineraryBuilder: React.FC = () => {
  const { t } = useTranslation("pages");

  return (
    <FeaturePageLayout
      icon={<ListTodo size={26} />}
      eyebrow={t("fp_eyebrow")}
      title={t("fpib_title")}
      subtitle={t("fpib_subtitle")}
      cta={{ label: t("fpib_cta"), to: "/" }}
    >
      <FeatureCard icon={<MapPin size={20} />} title={t("fpib_c1_title")} description={t("fpib_c1_desc")} />
      <FeatureCard icon={<Clock size={20} />} title={t("fpib_c2_title")} description={t("fpib_c2_desc")} />
      <FeatureCard icon={<Sparkles size={20} />} title={t("fpib_c3_title")} description={t("fpib_c3_desc")} />
      <FeatureCard icon={<Landmark size={20} />} title={t("fpib_c4_title")} description={t("fpib_c4_desc")} />
      <FeatureCard icon={<Shuffle size={20} />} title={t("fpib_c5_title")} description={t("fpib_c5_desc")} />
    </FeaturePageLayout>
  );
};

export default ItineraryBuilder;
