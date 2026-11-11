"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import {
  InlineSurveyTemplates,
  SurveyTemplateDetail,
} from "@/features/survey-templates";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import { useParams, useRouter } from "next/navigation";

/**
 * Same layout as EBR /home/[id]: template list on the left (hidden on
 * phones), resizable divider, template detail on the right.
 */
export default function SurveyTemplateDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const isMobile = useMobile();
  const isTablet = useTablet();
  const templateId = Number(params.id);

  const closeDetail = () => router.push("/templates");

  return (
    <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize={isTablet ? "25%" : "30%"}
            minSize={isTablet ? "20%" : "25%"}
            className="min-h-0 min-w-0 overflow-hidden"
          >
            <InlineSurveyTemplates />
          </ResizablePanel>
        )}

        {!isMobile && <ResizableHandle />}

        <ResizablePanel
          defaultSize={isMobile ? "100%" : isTablet ? "75%" : "70%"}
          minSize="0%"
          className="min-h-0 min-w-0 overflow-auto p-2 md:p-4"
        >
          <SurveyTemplateDetail
            key={templateId}
            templateId={templateId}
            onClose={closeDetail}
            onDeleted={closeDetail}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
