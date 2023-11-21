import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { Sign } from "crypto";

export default function Home() {
  const user = useUser();
  console.log(user);
  return (
    <div>
      {!user.isSignedIn && <SignInButton />}
      {!!user.isSignedIn && <SignOutButton />}
    </div>
  );
}
