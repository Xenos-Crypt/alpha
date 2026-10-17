namespace AnotherWorld.Traffic
{
    // Another World's own traffic code — not a real-world jurisdiction's. Fine
    // amounts are in Coins (the game's existing currency, NeighbourhoodPlayer.Coins),
    // matching the CR scale 1:1. Only the subset the engine can actually detect
    // is wired to enforcement; the other ~90 offences in the source rulebook
    // need systems (seatbelts, phones, insurance papers, cargo, flight
    // corridors, autonomous-vehicle software) that don't exist in this game yet.
    public enum Offence
    {
        Speeding1, Speeding2, Speeding3, Speeding4,   // Category 1 #1-4
        RedSignal,                                     // Category 2 #11
        FailGiveWay,                                    // Category 2 #13 (roundabout/junction give-way)
        WrongWay,                                        // Category 3 #27
        CycleLane,                                        // Category 3 #25
        BlockingIntersection,                              // Category 3 #26
        TramYield,                                          // not in the source list — same detectable shape as a give-way failure, costed the same
        FailGiveWayPedestrian,                               // Category 5 #44
        UnlicensedDriving,                                    // Category 6 #51
        SuspendedDriving,                                      // Category 6 #52
        NoInsurance,                                             // Category 6 #54
        NoSeatbelt,                                               // Category 5 #42
        HandheldPhone,                                             // Category 5 #41
        UnsecuredCargo,                                             // Category 7 #68
        ProhibitedAirCorridor,                                       // Category 10 #96
        PavementDriving,                                              // Category 3 — driving off the road onto the pedestrian pavement
    }
    public readonly struct OffenceInfo
    {
        public readonly string Reason; public readonly int Fine; public readonly int Points; public readonly bool ImmediateSuspension;
        public OffenceInfo(string reason, int fine, int points, bool immediateSuspension = false)
        { Reason = reason; Fine = fine; Points = points; ImmediateSuspension = immediateSuspension; }
    }
    public static class TrafficOffences
    {
        public static OffenceInfo Describe(Offence o) => o switch
        {
            Offence.Speeding1 => new("exceeded the speed limit by 1-10 km/h", 100, 1),
            Offence.Speeding2 => new("exceeded the speed limit by 11-20 km/h", 250, 2),
            Offence.Speeding3 => new("exceeded the speed limit by 21-40 km/h", 600, 4),
            Offence.Speeding4 => new("exceeded the speed limit by over 40 km/h", 1500, 6, true),
            Offence.RedSignal => new("ran a red light", 600, 3),
            Offence.FailGiveWay => new("ignored a give-way at a junction", 250, 2),
            Offence.WrongWay => new("drove on the wrong side of the road", 1000, 5),
            Offence.CycleLane => new("drove in a cycle lane", 400, 2),
            Offence.BlockingIntersection => new("blocked an intersection", 250, 1),
            Offence.TramYield => new("failed to give way to a tram", 500, 2),
            Offence.FailGiveWayPedestrian => new("failed to give way to pedestrians", 500, 3),
            Offence.UnlicensedDriving => new("drove without a valid licence", 1500, 0, true),
            Offence.SuspendedDriving => new("drove while suspended", 3000, 0, true),
            Offence.NoInsurance => new("drove without required insurance", 1000, 0),
            Offence.NoSeatbelt => new("failed to wear a seat belt", 300, 2),
            Offence.HandheldPhone => new("used a handheld phone while driving", 500, 3),
            Offence.UnsecuredCargo => new("carried an unsecured load", 600, 3),
            Offence.ProhibitedAirCorridor => new("entered a prohibited air corridor", 3000, 0, true),
            Offence.PavementDriving => new("drove on the pedestrian pavement", 250, 3),
            _ => new("committed a traffic offence", 100, 1),
        };
        // Points stay on the record for this long before expiring (a rolling
        // window, not a lifetime total) — matches "12 points within a rolling
        // period" rather than tracking real calendar years.
        public const float PointRollingWindow = 300;
        public const int SuspendAtPoints = 12;
        public const float SuspensionSeconds = 120;
        // A 2nd offence of the SAME type within this window costs 1.5x the fine, a 3rd costs 2x.
        public const float RepeatWindow = 180;
    }
}
