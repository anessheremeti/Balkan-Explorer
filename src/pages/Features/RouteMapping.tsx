import React from "react";
import { useTranslation } from "react-i18next";
import { Map as MapIcon, Navigation, Layers, MousePointerClick, Compass } from "lucide-react";
import FeaturePageLayout, { FeatureCard } from "./FeaturePageLayout";

const RouteMapping: React.FC = () => {
  const { t } = useTranslation("pages");

  return (
    <FeaturePageLayout
      icon={<MapIcon size={26} />}
      eyebrow={t("fp_eyebrow")}
      title={t("fprm_title")}
      subtitle={t("fprm_subtitle")}
      cta={{ label: t("fprm_cta"), to: "/my-travels" }}
    >
      <FeatureCard icon={<MousePointerClick size={20} />} title={t("fprm_c1_title")} description={t("fprm_c1_desc")} />
      <FeatureCard icon={<Layers size={20} />} title={t("fprm_c2_title")} description={t("fprm_c2_desc")} />
      <FeatureCard icon={<Navigation size={20} />} title={t("fprm_c3_title")} description={t("fprm_c3_desc")} />
      <FeatureCard icon={<Compass size={20} />} title={t("fprm_c4_title")} description={t("fprm_c4_desc")} />
    </FeaturePageLayout>
  );
};

export default RouteMapping;
