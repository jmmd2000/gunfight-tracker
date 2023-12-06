import Head from "next/head";

export default function Page404() {
  return (
    <>
      <Head>
        <title>404</title>
      </Head>
      <div className="mt-24 flex h-56 w-full flex-col items-center justify-center">
        <h1 className="text-4xl font-bold text-white">404</h1>
        <h1 className="text-xl font-bold text-[#D2D2D3]">Page not found.</h1>
      </div>
    </>
  );
}
