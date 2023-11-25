import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { api } from "~/utils/api";
import { useEffect } from "react";

export default function Home() {
  const user = useUser();
  // const { data, isLoading, isError } = api.user.getAll.useQuery();
  console.log(user);
  const {
    mutate: createUser,
    isLoading: creatingUser,
    isError: failedCreatingUser,
  } = api.user.create.useMutation();

  useEffect(() => {
    if (user.isSignedIn) {
      createUser({
        first_name: user.user.firstName,
        last_name: user.user.lastName,
        avatar_url: user.user.imageUrl,
      });
    }
  }, []);

  return <div></div>;
}
