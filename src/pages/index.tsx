import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export default function Home() {
  const user = useUser();
  console.log(user);
  return (
    <div>
      {!user.isSignedIn && <SignInButton />}
      {!!user.isSignedIn && (
        <Button variant="secondary">
          <SignOutButton />
        </Button>
      )}
      <Button variant="default">Hello</Button>
      <Button variant="link">Hello</Button>
      <Button variant="secondary">Hello</Button>
      <Button variant="destructive">Hello</Button>
      <Button variant="outline">Hello</Button>
      <Button variant="ghost">Hello</Button>
    </div>
  );
}
