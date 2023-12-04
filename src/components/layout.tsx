/* eslint-disable @next/next/no-img-element */
/* eslint-disable react/no-unescaped-entities */
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/router";
import { type PropsWithChildren, useState, useEffect } from "react";
import { api } from "~/utils/api";
import { Menu, X, Bell, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInButton, SignOutButton, useUser } from "@clerk/nextjs";
import { PuffLoader, ScaleLoader } from "react-spinners";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { TeamRequest } from "~/types";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useToastEffect } from "~/hooks/useToastEffect";
import { set } from "zod";

export const Layout = (props: PropsWithChildren) => {
  return (
    <>
      <Navbar />
      <main>{props.children}</main>
      <ToastContainer
        toastStyle={{
          // same as bg-gray-700 bg-opacity-10
          background: "rgba(55, 65, 81, 0.1)",
          color: "#D2D2D3",
          borderRadius: "0.375rem",
          backdropFilter: "blur(16px)",
          border: "1px solid #3f3f46",
        }}
        progressStyle={{
          borderRadius: "0.375rem",
        }}
        position="top-right"
      />
    </>
  );
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const user = useUser();
  return (
    <nav
      className="bg-gray-0 w-full rounded-md bg-opacity-10 bg-clip-padding shadow-lg backdrop-blur-lg backdrop-filter
    "
    >
      <div className="mr-auto px-4">
        <div className="flex justify-between">
          <div className="flex space-x-7">
            <div>
              {/* Website Logo */}
              <Link href="/" passHref legacyBehavior>
                <a className="flex items-center px-2 py-4">
                  <span className="text-2xl font-semibold text-gray-200">
                    GunfightTracker
                  </span>
                </a>
              </Link>
            </div>
            {/* Primary Navbar items */}
            <div className="hidden items-center space-x-1 md:flex">
              <Link href="/teams" passHref legacyBehavior>
                <a className="px-2 py-4 font-semibold text-gray-500 hover:text-gray-300">
                  Teams
                </a>
              </Link>
              <Link href="/matches" passHref legacyBehavior>
                <a className="px-2 py-4 font-semibold text-gray-500 hover:text-gray-300">
                  Matches
                </a>
              </Link>
              <Link href="/stats" passHref legacyBehavior>
                <a className="px-2 py-4 font-semibold text-gray-500 hover:text-gray-300">
                  Stats
                </a>
              </Link>
            </div>
          </div>
          {/* Secondary Navbar items */}
          <div className="ml-auto hidden items-center space-x-3 md:flex">
            <RequestSidebar />
            {!user.isSignedIn && (
              <SignInButton>
                <Button variant="outline">Login</Button>
              </SignInButton>
            )}
            {!!user.isSignedIn && (
              <SignOutButton>
                <Button variant="outline">Log Out</Button>
              </SignOutButton>
            )}
          </div>
          {/* Mobile menu button */}
          <div className="flex items-center md:hidden">
            <button
              type="button"
              className="mobile-menu-button outline-none"
              onClick={() => setIsOpen(!isOpen)}
            >
              {isOpen ? (
                <X className="h-6 w-6 text-gray-500" />
              ) : (
                <Menu className="h-6 w-6 text-gray-500" />
              )}
            </button>
          </div>
        </div>
      </div>
      {/* Mobile Menu */}
      <div className={`md:hidden ${isOpen ? "block" : "hidden"}`}>
        <Link href="/teams" passHref legacyBehavior>
          <a className="block px-8 py-4 text-sm font-semibold text-white">
            Teams
          </a>
        </Link>
        <Link href="/matches" passHref legacyBehavior>
          <a className="block px-8 py-4 text-sm font-semibold text-white">
            Matches
          </a>
        </Link>
        <Link href="/stats" passHref legacyBehavior>
          <a className="block px-8 py-4 text-sm font-semibold text-white">
            Stats
          </a>
        </Link>
        <div className="flex w-full items-center justify-center pb-6">
          {!user.isSignedIn && (
            <SignInButton>
              <Button variant="outline" size="sm">
                Login
              </Button>
            </SignInButton>
          )}
          {!!user.isSignedIn && (
            <SignInButton>
              <Button variant="outline" size="sm">
                Log Out
              </Button>
            </SignInButton>
          )}
        </div>
      </div>
    </nav>
  );
};

const RequestSidebar = () => {
  const { data, isLoading, isError, refetch } =
    api.teamrequest.getAllWithMember.useQuery();
  return (
    <Sheet>
      <SheetTrigger>
        {/* <Button variant="secondary"> */}
        <Bell />
        {/* </Button> */}
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Team Requests</SheetTitle>
          <SheetDescription>
            When people send you team requests, they'll show up here.
          </SheetDescription>
          <SheetDescription>
            By accepting a request, you give permission for the creator of the
            team to add data that will modify your stats.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-8 flex flex-col gap-4">
          {data?.map((teamrequest) => (
            <TeamRequestCard
              key={teamrequest.id}
              teamrequest={teamrequest}
              refetch={refetch}
            />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export const TeamRequestCard = (props: {
  teamrequest: TeamRequest;
  revokeable?: boolean;
  refetch?: () => void;
}) => {
  const { teamrequest, revokeable = false, refetch } = props;
  const router = useRouter();

  const [requestAccepted, setRequestAccepted] = useState(false);
  const [requestDeclined, setRequestDeclined] = useState(false);
  const [requestRevoked, setRequestRevoked] = useState(false);

  const {
    mutate: acceptTeamRequest,
    isLoading: acceptingRequest,
    error: cantAcceptRequest,
  } = api.teamrequest.accept.useMutation();
  const {
    mutate: declineTeamRequest,
    isLoading: decliningRequest,
    error: cantDeclineRequest,
  } = api.teamrequest.decline.useMutation();

  const {
    mutate: revokeTeamRequest,
    isLoading: revokingRequest,
    error: cantRevokeRequest,
  } = api.teamrequest.revoke.useMutation();

  useToastEffect(
    acceptingRequest,
    requestAccepted,
    !!cantAcceptRequest,
    "accepting-request",
    "Accepting request...",
    "Team request accepted!",
    "Couldn't accept request.",
  );

  useToastEffect(
    decliningRequest,
    requestDeclined,
    !!cantDeclineRequest,
    "declining-request",
    "Declining request...",
    "Team request declined.",
    "Couldn't decline request.",
  );

  useToastEffect(
    revokingRequest,
    requestRevoked,
    !!cantRevokeRequest,
    "revoking-request",
    "Revoking request...",
    "Team request revoked.",
    "Couldn't revoke request.",
  );

  return (
    <div className="flex items-center justify-between gap-2 rounded-md border border-zinc-700 bg-zinc-700 bg-opacity-10 bg-clip-padding p-4 shadow-lg backdrop-blur-lg backdrop-filter">
      <div className="flex flex-col items-start">
        <h1 className="text-xl font-semibold text-zinc-300">
          {teamrequest.team.name}
        </h1>
        {/* //* Very dirty way of accessing this, but since there's max 2 players, the person who sent the request will always be the user here */}
        <p className="text-sm font-medium text-zinc-500">
          {teamrequest.team.members[0]?.user.username}
        </p>
      </div>
      {teamrequest.status === "pending" && !revokeable && (
        <div className="flex gap-2">
          <Button
            size="sm"
            className="bg-green-500 hover:bg-green-600"
            onClick={() => {
              acceptTeamRequest(
                {
                  teamID: teamrequest.teamId,
                  fromUserGoogleId: teamrequest.fromUserGoogleId,
                },
                {
                  onSuccess: () => {
                    setRequestAccepted(true);
                    if (refetch) {
                      refetch();
                    }
                  },
                },
              );
            }}
            disabled={decliningRequest || acceptingRequest}
          >
            {acceptingRequest ? <PuffLoader size={20} /> : <Check />}
          </Button>
          <Button
            size="sm"
            className="bg-red-500 hover:bg-red-600"
            onClick={() => {
              declineTeamRequest(
                {
                  teamID: teamrequest.teamId,
                  fromUserGoogleId: teamrequest.fromUserGoogleId,
                },
                {
                  onSuccess: () => {
                    setRequestDeclined(true);
                    if (refetch) {
                      refetch();
                    }
                  },
                },
              );
            }}
            disabled={decliningRequest || acceptingRequest}
          >
            {decliningRequest ? <PuffLoader size={20} /> : <X />}
          </Button>
        </div>
      )}
      {teamrequest.status === "pending" && !!revokeable && (
        <>
          <p className="text-zinc-600">Pending...</p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                revokeTeamRequest(
                  {
                    teamId: teamrequest.teamId,
                    memberId: teamrequest.toUserGoogleId,
                  },
                  {
                    onSuccess: () => {
                      setRequestRevoked(true);
                      if (refetch) {
                        refetch();
                      }
                    },
                    onError: () => {
                      setRequestRevoked(false);
                    },
                  },
                );
              }}
              disabled={revokingRequest}
            >
              {revokingRequest ? <PuffLoader size={20} /> : "Revoke"}
            </Button>
          </div>
        </>
      )}
      {teamrequest.status === "rejected" && !!revokeable && (
        <>
          <p className="text-red-600">Rejected</p>
          <div className="flex gap-2">
            {requestRevoked ? (
              <p>Revoked: {requestRevoked}</p>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  revokeTeamRequest(
                    {
                      teamId: teamrequest.teamId,
                      memberId: teamrequest.toUserGoogleId,
                    },
                    {
                      onSuccess: () => {
                        setRequestRevoked(true);
                        if (refetch) {
                          refetch();
                        }
                      },
                      onError: () => {
                        setRequestRevoked(false);
                      },
                    },
                  );
                }}
                disabled={revokingRequest}
              >
                {revokingRequest ? <PuffLoader size={20} /> : "Revoke"}
              </Button>
            )}
          </div>
        </>
      )}
      {teamrequest.status === "accepted" && (
        <p className="text-green-600">Accepted</p>
      )}
      {teamrequest.status === "rejected" && !revokeable && (
        <p className="text-red-600">Rejected</p>
      )}
    </div>
  );
};
