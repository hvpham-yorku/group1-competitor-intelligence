"use client";

import { SessionProvider } from "next-auth/react";
import { MantineProvider } from "@mantine/core";

const SessionWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <SessionProvider>
      <MantineProvider
        withGlobalStyles={false}
        withNormalizeCSS={false}
        theme={{
          colorScheme: 'dark',
          primaryColor: 'cyan',
        }}
      >
        {children}
      </MantineProvider>
    </SessionProvider>
  );
};

export default SessionWrapper;