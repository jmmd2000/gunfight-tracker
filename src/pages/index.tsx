import { useUser } from "@clerk/nextjs";
import { api } from "~/utils/api";
import { useEffect } from "react";

export default function Home() {
  const user = useUser();
  const {
    mutate: createUser,
    // isLoading: creatingUser,
    // isError: failedCreatingUser,
  } = api.user.create.useMutation();

  const { data } = api.user.getCurrent.useQuery(undefined, {
    retry: false,
  });

  useEffect(() => {
    if (user.isSignedIn && data === undefined) {
      console.log("creating user");
      createUser({
        first_name: user.user.firstName,
        last_name: user.user.lastName,
        avatar_url: user.user.imageUrl,
      });
    } else {
      return;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.isSignedIn, data]);

  return (
    <div className="h-screen max-w-full bg-triangle bg-center bg-no-repeat">
      <div className="flex h-screen flex-col items-center justify-center gap-2 ">
        <h1
          className="glass
         mb-10 p-3 text-2xl font-medium leading-6 tracking-tight text-zinc-200 sm:p-4 sm:text-3xl lg:p-8 lg:text-6xl"
        >
          Welcome to Gunfight Tracker
        </h1>
        <p
          className="glass
         p-1 text-xs text-zinc-200 sm:p-2 sm:text-sm lg:p-3 lg:text-lg"
        >
          Track your <i>Call of Duty Gunfight</i> matches to gain valuable
          insights.
        </p>
      </div>
    </div>
  );
}
