import { type AppType } from "next/app";
import { Inter } from "next/font/google";

import { api } from "~/utils/api";

const inter = Inter({ subsets: ["latin"] });

import "~/styles/globals.css";
import { ClerkProvider } from "@clerk/nextjs";

const MyApp: AppType = ({ Component, pageProps }) => {
  return (
    <div className={inter.className}>
      <ClerkProvider {...pageProps}>
        <Component {...pageProps} />
      </ClerkProvider>
    </div>
  );
};

export default api.withTRPC(MyApp);
