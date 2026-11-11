"use client";

import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { InlineSurveyRecords, SurveyRecordDetail } from "@/features/survey-records";
import useMobile from "@/hooks/use-mobile";
import useTablet from "@/hooks/use-tablet";
import { API_ROUTES } from "@/lib/api-routes";
import { useParams, useRouter } from "next/navigation";
import { useSWRConfig } from "swr";

/**
 * Same layout as EBR /home/[id]: list on the left (hidden on phones),
 * resizable divider, record detail on the right.
 */
export default function SurveyRecordDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { mutate } = useSWRConfig();
  const isMobile = useMobile();
  const isTablet = useTablet();
  const recordId = params.id;

  const closeDetail = () => {
    void mutate(API_ROUTES.surveyRecords.base);
    router.push("/home");
  };

  return (
    <div className="h-full overflow-hidden rounded-lg bg-white shadow-md">
      <ResizablePanelGroup>
        {!isMobile && (
          <ResizablePanel
            defaultSize={isTablet ? "25%" : "30%"}
            minSize={isTablet ? "20%" : "25%"}
            className="min-h-0 min-w-0 overflow-hidden"
          >
            <InlineSurveyRecords />
          </ResizablePanel>
        )}

        {!isMobile && <ResizableHandle />}

        <ResizablePanel
          defaultSize={isMobile ? "100%" : isTablet ? "75%" : "70%"}
          minSize="0%"
          className="min-h-0 min-w-0 overflow-auto p-2 md:p-4"
        >
          <SurveyRecordDetail
            key={recordId}
            recordId={recordId}
            onClose={closeDetail}
            onDeleted={closeDetail}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
}
