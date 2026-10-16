namespace AnotherWorld.Traffic
{
    // UK Highway Code / Road Traffic Act moving-offence catalogue. Fixed
    // Penalty Notice amounts and penalty points reflect real current UK
    // tariffs (DVSA/Gov.uk): most moving traffic offences are a flat £100 FPN
    // + 3 points; pavement driving (Highway Code rule 145 / Road Traffic Act
    // 1835 s.72) is a non-endorsable nuisance offence, £50 and no points.
    public enum Offence { RedSignal, PedestrianCrossing, WrongWay, Pavement, CycleLane, RoundaboutYield, RoundaboutIsland, Speeding, TramYield }
    public readonly struct OffenceInfo
    {
        public readonly string Reason; public readonly int Fine; public readonly int Points;
        public OffenceInfo(string reason, int fine, int points) { Reason = reason; Fine = fine; Points = points; }
    }
    public static class TrafficOffences
    {
        public static OffenceInfo Describe(Offence o) => o switch
        {
            Offence.RedSignal => new("ran a red traffic signal — Highway Code rule 109", 100, 3),
            Offence.PedestrianCrossing => new("failed to stop for pedestrians crossing — rule 195", 100, 3),
            Offence.WrongWay => new("drove against the flow of traffic — rule 143", 100, 3),
            Offence.Pavement => new("drove on the pavement — rule 145", 50, 0),
            Offence.CycleLane => new("drove in a mandatory cycle lane — rule 140", 100, 3),
            Offence.RoundaboutYield => new("failed to give way at a roundabout — rule 186", 100, 3),
            Offence.RoundaboutIsland => new("cut across a roundabout island — rule 188", 100, 3),
            Offence.Speeding => new("exceeded the speed limit — rule 124", 100, 3),
            Offence.TramYield => new("failed to give way to a tram — rule 300", 100, 3),
            _ => new("committed a traffic offence", 60, 0),
        };
        // UK licences are revoked ("totting up") at 12 points within 3 years —
        // modelled here as a timed suspension rather than tracking years.
        public const int DisqualifyAtPoints = 12;
        public const float DisqualificationSeconds = 120;
    }
}
