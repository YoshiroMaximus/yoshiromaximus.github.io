"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { SignInButton, SignUpButton } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function UserAuthForm() {
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const router = useRouter()

  return (
    <Card className="w-[350px] bg-white/70 dark:bg-slate-800/70 backdrop-blur-md">
      <CardHeader>
        <CardTitle className="text-2xl text-center">Welcome to Sn3k</CardTitle>
        <CardDescription className="text-center">Sign in to access your games and preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          <TabsContent value="signin" className="mt-4 flex justify-center">
            <SignInButton mode="modal" afterSignInUrl="/">
              <Button size="lg" className="w-full">
                Sign In
              </Button>
            </SignInButton>
          </TabsContent>
          <TabsContent value="signup" className="mt-4 flex justify-center">
            <SignUpButton mode="modal" afterSignUpUrl="/">
              <Button size="lg" className="w-full">
                Create Account
              </Button>
            </SignUpButton>
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-center">
        <Button variant="ghost" onClick={() => router.push("/")}>
          Continue as Guest
        </Button>
      </CardFooter>
    </Card>
  )
}

