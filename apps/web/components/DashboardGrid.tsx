"use client";

import { useMemo } from "react";
import {
  Responsive,
  useContainerWidth,
  verticalCompactor,
  type Layout,
} from "react-grid-layout";
import type { Panel } from "../lib/types";
import { PanelCard } from "./PanelCard";

export function DashboardGrid({
  panels,
  params,
  refreshTick,
  editMode,
  onLayoutChange,
  onEditPanel,
  onDeletePanel,
}: {
  panels: Panel[];
  params: Record<string, unknown>;
  refreshTick: number;
  editMode: boolean;
  onLayoutChange: (layout: Layout) => void;
  onEditPanel: (id: string) => void;
  onDeletePanel: (id: string) => void;
}) {
  const { width, containerRef } = useContainerWidth();

  const layout: Layout = useMemo(
    () =>
      panels.map((p) => ({
        i: p.id,
        x: p.gridPos.x,
        y: p.gridPos.y,
        w: p.gridPos.w,
        h: p.gridPos.h,
        minW: 2,
        minH: 3,
      })),
    [panels],
  );

  return (
    <div ref={containerRef}>
      {width > 0 ? (
        <Responsive
          className="layout"
          width={width}
          layouts={{ lg: layout, md: layout, sm: layout }}
          breakpoints={{ lg: 1000, md: 700, sm: 0 }}
          cols={{ lg: 12, md: 12, sm: 6 }}
          rowHeight={38}
          margin={[14, 14]}
          dragConfig={{ enabled: editMode, handle: ".panel-drag-handle" }}
          resizeConfig={{ enabled: editMode }}
          compactor={verticalCompactor}
          onLayoutChange={(l) => editMode && onLayoutChange(l)}
        >
          {panels.map((p) => (
            <div key={p.id}>
              <PanelCard
                panel={p}
                params={params}
                refreshTick={refreshTick}
                editMode={editMode}
                onEdit={() => onEditPanel(p.id)}
                onDelete={() => onDeletePanel(p.id)}
              />
            </div>
          ))}
        </Responsive>
      ) : null}
    </div>
  );
}
