import Image from "next/image";

type LogoProps = {
  sidebarBrand?: boolean;
};

export default function Logo({ sidebarBrand = false }: LogoProps) {
  if (sidebarBrand) {
    return (
      <Image
        src="/logo/primey.svg"
        width={220}
        height={72}
        className="h-16 w-full object-contain"
        alt="Mhamcloud"
        priority
      />
    );
  }

  return (
    <Image
      src="/logo/primey.svg"
      width={32}
      height={32}
      className="me-1 size-8 rounded-[5px] object-contain transition-all group-data-collapsible:size-6 group-data-[collapsible=icon]:size-8"
      alt="Mhamcloud"
    />
  );
}
