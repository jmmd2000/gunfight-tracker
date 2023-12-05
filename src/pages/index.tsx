import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { api } from "~/utils/api";
import { useEffect } from "react";

export default function Home() {
  const user = useUser();
  const {
    mutate: createUser,
    isLoading: creatingUser,
    isError: failedCreatingUser,
  } = api.user.create.useMutation();

  //- TODO: check if user already exists in db

  useEffect(() => {
    if (user.isSignedIn) {
      createUser({
        first_name: user.user.firstName,
        last_name: user.user.lastName,
        avatar_url: user.user.imageUrl,
      });
    }
  }, []);

  //- TODO: figure out a nice svg for the background

  return (
    <div>
      <div className="flex h-screen flex-col items-center justify-center gap-2">
        <h1 className="mb-10 text-6xl font-medium leading-6 tracking-tight text-zinc-200">
          Welcome to Gunfight Tracker
        </h1>
        <p className="text-lg text-zinc-400">
          Record the result of each match you play to gain valuable insights.
        </p>
      </div>
    </div>
  );
}
