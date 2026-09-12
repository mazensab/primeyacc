import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export function DigitalWallets() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Digital Wallets</CardTitle>
        <CardAction>
          <Button variant="outline" asChild>
            <Link href="#">
              <ChevronRight />
            </Link>
          </Button>
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        <Link
          href="#"
          className="hover:border-primary/30 hover:bg-muted block rounded-md border px-4 py-3 transition-colors">
          <div className="mb-2 flex items-center gap-2">
            <img
              className="size-8 object-contain"
              src={"/images/crypto-icons/bitcoin.svg"}
              alt="shadcn/ui"
            />
            <span>Bitcoin Wallet</span>
          </div>
          <div>4.434953 BTC</div>
        </Link>
        <Link
          href="#"
          className="hover:border-primary/30 hover:bg-muted block rounded-md border px-4 py-3 transition-colors">
          <div className="mb-2 flex items-center gap-2">
            <img
              className="size-8 object-contain"
              src={"/images/crypto-icons/ethereum.svg"}
              alt="shadcn/ui"
            />
            <span>Ethereum Wallet</span>
          </div>
          <div>4.434953 ETH</div>
        </Link>
        <Link
          href="#"
          className="hover:border-primary/30 hover:bg-muted block rounded-md border px-4 py-3 transition-colors">
          <div className="mb-2 flex items-center gap-2">
            <img
              className="size-8 object-contain"
              src={"/images/crypto-icons/avalanche.svg"}
              alt="..."
            />
            <span>Avalanche Wallet</span>
          </div>
          <div>3.434953 ETH</div>
        </Link>
      </CardContent>
    </Card>
  );
}
