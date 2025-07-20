"use client"

import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase-client"
import type { User, Session } from "@supabase/supabase-js"
import type { Profile } from "@/lib/supabase"

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchProfile = async (userId: string, retryCount = 0) => {
    try {
      
      const { data: profile, error } = await supabase.from("profiles").select("*").eq("id", userId).single()

      if (error) {
        console.error("Profile fetch error:", error)

        if (error.code === "PGRST116" && retryCount < 3) {
          // Profile doesn't exist, try to create it
       
          const currentUser = await supabase.auth.getUser()
          if (currentUser.data.user) {
            const { data: newProfile, error: insertError } = await supabase
              .from("profiles")
              .insert({
                id: userId,
                email: currentUser.data.user.email!,
                full_name:
                  currentUser.data.user.user_metadata?.full_name ||
                  currentUser.data.user.user_metadata?.name ||
                  currentUser.data.user.email?.split("@")[0],
                role: "staff",
              })
              .select()
              .single()

            if (insertError) {
              console.error("Error creating profile:", insertError)
              // Retry fetching after a short delay
              setTimeout(() => fetchProfile(userId, retryCount + 1), 1000)
              return
            } else {
              setProfile(newProfile)
            }
          }
        }
      } else {
        setProfile(profile)
      }
    } catch (error) {
      console.error("Error in fetchProfile:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let mounted = true

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        fetchProfile(session.user.id)
      } else {
        setLoading(false)
      }
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return

      setSession(session)
      setUser(session?.user ?? null)

      if (session?.user) {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          await fetchProfile(session.user.id)
        }
      } else {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) {
        console.error("Sign in error:", error)
      }

      return { data, error }
    } catch (error) {
      console.error("Sign in exception:", error)
      return { data: null, error: error as any }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string, fullName?: string) => {
    try {
      setLoading(true)
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            name: fullName,
          },
        },
      })

      if (error) {
        console.error("Sign up error:", error)
      } else if (data.user) {
        console.log("User created:", data.user.email)
      }

      return { data, error }
    } catch (error) {
      console.error("Sign up exception:", error)
      return { data: null, error: error as any }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (!error) {
      setUser(null)
      setSession(null)
      setProfile(null)
    }
    return { error }
  }

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return { error: new Error("No user logged in") }

    const { data, error } = await supabase.from("profiles").update(updates).eq("id", user.id).select().single()

    if (!error && data) {
      setProfile(data)
    }

    return { data, error }
  }

  return {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    updateProfile,
    refetchProfile: () => user && fetchProfile(user.id),
  }
}
