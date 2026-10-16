using UnityEngine;
namespace AnotherWorld.Traffic
{
    // A real route network through controlled airspace — the sky equivalent of
    // RoadNetwork/LaneRoute for ground traffic, not just a couple of no-fly
    // circles. Named hubs (the airport, every city centre, the rocket launch
    // pad, the highlands) are joined by corridor segments at a defined cruise
    // altitude band, airport-as-hub, matching how real air traffic actually
    // routes through a central airport rather than flying point-to-point.
    //
    // Low-level flight stays free below Floor (a skycar weaving through city
    // streets doesn't need a filed route, same as a car doesn't need to be on
    // a motorway). Each hub also has a wide "approach funnel" at any altitude,
    // so climbing out of or descending into a hub doesn't falsely trip the
    // "must be in a corridor segment" check.
    public static class AirCorridor
    {
        public const float Floor = 40;
        public const float CruiseLow = 55, CruiseHigh = 110;
        public const float CorridorRadius = 30;
        public const float ApproachRadius = 70;

        public static readonly (string Name, Vector2 Point)[] Hubs =
        {
            ("Ashford Airport", new Vector2(-690, -20)),      // hub 0 — primary
            ("Ashford City Centre", new Vector2(32, 16)),
            ("Riverside", new Vector2(-96, 656)),
            ("Ashford Capital", new Vector2(224, 656)),
            ("Poison Land", new Vector2(608, 208)),
            ("Northhaven", new Vector2(992, -368)),
            ("Rocket Launch Pad", new Vector2(452, 950)),
            ("Ashford Highlands", new Vector2(-310, 660)),
        };
        static readonly (int A, int B)[] Segments = { (0,1), (0,2), (0,3), (0,4), (0,5), (0,6), (0,7) };

        public static bool InPermittedCorridor(Vector3 position)
        {
            if (position.y < Floor) return true;
            var p = new Vector2(position.x, position.z);
            foreach (var h in Hubs) if ((p - h.Point).sqrMagnitude < ApproachRadius * ApproachRadius) return true;
            if (position.y < CruiseLow || position.y > CruiseHigh) return false;
            foreach (var (a, b) in Segments)
            {
                var from = Hubs[a].Point; var to = Hubs[b].Point;
                var edge = to - from;
                float t = Mathf.Clamp01(Vector2.Dot(p - from, edge) / Mathf.Max(0.001f, edge.sqrMagnitude));
                var nearest = from + edge * t;
                if ((p - nearest).sqrMagnitude < CorridorRadius * CorridorRadius) return true;
            }
            return false;
        }
    }
}
