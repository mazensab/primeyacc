"use client";

import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger
} from "@/components/ui/drawer";
import {
  ThemeColorSelector,
  ChartPresetSelector,
  FontSelector,
  DisplayFontSelector,
  SidebarCollapseSelector,
  SidebarVariantSelector,
  ThemeScaleSelector,
  ColorModeSelector,
  ContentLayoutSelector,
  ThemeRadiusSelector,
  ResetThemeButton,
  RandomThemeButton
} from "@/components/theme-customizer/index";

export function ThemeCustomizerPanel() {
  return (
    <Drawer direction="right">
      <DrawerTrigger asChild>
        <Button size="icon-sm" variant="ghost">
          <Palette />
        </Button>
      </DrawerTrigger>
      <DrawerContent className="w-80" overlay={false}>
        <DrawerHeader>
          <DrawerTitle>Customize</DrawerTitle>
          <DrawerDescription>Adjust the look and feel of the dashboard.</DrawerDescription>
        </DrawerHeader>
        <div className="grid space-y-4 overflow-y-auto px-4">
          <ThemeColorSelector />
          <ChartPresetSelector />
          <FontSelector />
          <DisplayFontSelector />
          <ThemeScaleSelector />
          <ThemeRadiusSelector />
          <ColorModeSelector />
          <ContentLayoutSelector />
          <SidebarCollapseSelector />
          <SidebarVariantSelector />
        </div>
        <DrawerFooter>
          <div className="mt-4 flex gap-2">
            <RandomThemeButton />
            <ResetThemeButton />
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
