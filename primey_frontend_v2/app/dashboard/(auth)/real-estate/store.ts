import { create } from "zustand";

type FilterState = {
  location: string;
  priceRange: string;
  customRange: number[];
  selectedType: string;
  bedroom: string;
  selectedAmenities: string[];
  setLocation: (value: string) => void;
  setPriceRange: (value: string) => void;
  setCustomRange: (value: number[]) => void;
  setSelectedType: (value: string) => void;
  setBedroom: (value: string) => void;
  toggleAmenity: (amenity: string) => void;
  resetFilters: () => void;
};

const initialFilters = {
  location: "all",
  priceRange: "all",
  customRange: [8000, 40000],
  selectedType: "all",
  bedroom: "any",
  selectedAmenities: [] as string[]
};

export const usePropertyFilterStore = create<FilterState>((set) => ({
  ...initialFilters,
  setLocation: (value) => set({ location: value }),
  setPriceRange: (value) => set({ priceRange: value }),
  setCustomRange: (value) => set({ customRange: value }),
  setSelectedType: (value) => set({ selectedType: value }),
  setBedroom: (value) => set({ bedroom: value }),
  toggleAmenity: (amenity) =>
    set((state) => ({
      selectedAmenities: state.selectedAmenities.includes(amenity)
        ? state.selectedAmenities.filter((item) => item !== amenity)
        : [...state.selectedAmenities, amenity]
    })),
  resetFilters: () => set(initialFilters)
}));
