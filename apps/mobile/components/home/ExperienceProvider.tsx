import { createContext, useContext, useEffect, useState } from "react";

import {
  checkIn,
  getExperienceStatus,
  getStreakMilestones,
} from "@/lib/gen/experience/experience";
import type {
  CheckInResponse,
  ExperienceResponse,
  StreakMilestonesResponse,
} from "@/lib/gen/model";

type ExperienceContextValue = {
  experience: ExperienceResponse | null;
  milestones: StreakMilestonesResponse | null;
  isLoading: boolean;
  error: string | null;
  lastCheckInResponse: CheckInResponse | null;
  performCheckIn: () => Promise<void>;
  refreshExperience: () => Promise<void>;
  refreshMilestones: () => Promise<void>;
};

const ExperienceContext = createContext<ExperienceContextValue | null>(null);

export function ExperienceProvider({ children }: { children: React.ReactNode }) {
  const [experience, setExperience] = useState<ExperienceResponse | null>(null);
  const [milestones, setMilestones] = useState<StreakMilestonesResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastCheckInResponse, setLastCheckInResponse] = useState<CheckInResponse | null>(null);

  const fetchExperienceStatus = async () => {
    try {
      const response = await getExperienceStatus();

      if (response.status === 200 && response.data) {
        setExperience(response.data);
        setError(null);
      } else if (response.status === 401) {
        setError("UNAUTHORIZED");
      } else {
        setError("FETCH_ERROR");
      }
    } catch (err) {
      console.error("Error fetching experience status:", err);

      // Check for specific error status codes
      if (err && typeof err === 'object' && 'status' in err) {
        if (err.status === 401) {
          setError("UNAUTHORIZED");
        } else {
          setError("FETCH_ERROR");
        }
      } else {
        setError("FETCH_ERROR");
      }
    }
  };

  const performCheckIn = async () => {
    try {
      setError(null);

      // Perform check-in
      const checkInResp = await checkIn();

      if (checkInResp.status === 200 && checkInResp.data) {
        setLastCheckInResponse(checkInResp.data);
        console.log("[ExperienceProvider] Check-in successful:", checkInResp.data);

        // TODO: Future enhancement - show notifications for:
        // - Level up (checkInResp.data.level_up)
        // - Streak broken (checkInResp.data.streak_broken)
        // - Milestones reached (checkInResp.data.milestone_reached)

        // Fetch updated experience status after check-in
        await fetchExperienceStatus();
      } else if (checkInResp.status === 401) {
        setError("UNAUTHORIZED");
      } else {
        setError("FETCH_ERROR");
      }
    } catch (err) {
      console.error("Error performing check-in:", err);

      // Check for specific error status codes
      if (err && typeof err === 'object' && 'status' in err) {
        if (err.status === 401) {
          setError("UNAUTHORIZED");
        } else {
          setError("FETCH_ERROR");
        }
      } else {
        setError("FETCH_ERROR");
      }
    }
  };

  const refreshExperience = async () => {
    try {
      setIsLoading(true);
      await fetchExperienceStatus();
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMilestones = async () => {
    try {
      const response = await getStreakMilestones();

      if (response.status === 200 && response.data) {
        setMilestones(response.data);
      } else if (response.status === 401) {
        setError("UNAUTHORIZED");
      }
    } catch (err) {
      console.error("Error fetching milestones:", err);
      // Don't override main error state for milestone fetch failures
    }
  };

  const refreshMilestones = async () => {
    await fetchMilestones();
  };

  // Initialize on mount: perform check-in, fetch experience, and fetch milestones
  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      await performCheckIn();
      await fetchMilestones();
      setIsLoading(false);
    };

    initialize();
  }, []); // Run once on mount

  const value: ExperienceContextValue = {
    experience,
    milestones,
    isLoading,
    error,
    lastCheckInResponse,
    performCheckIn,
    refreshExperience,
    refreshMilestones,
  };

  return (
    <ExperienceContext.Provider value={value}>
      {children}
    </ExperienceContext.Provider>
  );
}

export function useExperience() {
  const context = useContext(ExperienceContext);
  if (!context) {
    throw new Error("useExperience must be used within an ExperienceProvider");
  }
  return context;
}
