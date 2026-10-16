using UnityEngine;

namespace AnotherWorld.World
{
    // Places HostileCreature instances into the world WorldGeography already
    // builds. Kept separate from WorldGeography itself so the geometry-building
    // pass there stays about geometry; this is just where things that fight
    // back get planted, using the same coordinates WorldGeography.Highlands()
    // and the military sites already use.
    public static class WildlifeSpawner
    {
        // Wolf pack roaming the highland forest WorldGeography.Highlands() plants
        // trees across (x: -530..-320, z: 580..714 roughly). Built with
        // AnimalRoam.Create for a real body (legs, ears, eyes) instead of a
        // placeholder box, then swapped from its passive wander to a hostile chase.
        public static void SpawnHighlandWolves(Transform parent)
        {
            for (int n = 0; n < 7; n++)
            {
                var p = new Vector3(-420 + (n % 4) * 55 - 20, 0, 630 + (n / 4) * 55);
                var body = AnimalRoam.Create(parent, p, "Wolf", n);
                var passive = body.GetComponent<AnimalRoam>(); if (passive) Object.Destroy(passive);
                var c = body.AddComponent<HostileCreature>();
                c.Label = "Wolf"; c.MaxHealth = c.Health = 45; c.Speed = 5.5f; c.ChaseRange = 18; c.AttackRange = 1.4f; c.Damage = 9; c.AttackCooldown = 1.1f;
            }
        }

        // Passive until MilitaryAlert fires (see CityServices' "military" branch
        // and MilitaryAlert.cs), then hunts the player instead of arresting them
        // like PoliceDispatch does — matching the request that the military's
        // intent is lethal, not custody.
        public static void SpawnMilitaryGuards(Transform parent)
        {
            Vector3[] posts = {
                new Vector3(430, 0, 72), new Vector3(449, 0, 118), new Vector3(476, 0, 118), new Vector3(503, 0, 118),
                new Vector3(9000, 0, 8990), new Vector3(9030, 0, 8990),
            };
            foreach (var p in posts)
            {
                var person = WorldShapes.Person(parent, new Color(0.22f, 0.26f, 0.18f));
                person.position = p;
                var c = person.gameObject.AddComponent<HostileCreature>();
                c.Label = "Military Guard"; c.MilitaryGuard = true; c.MaxHealth = c.Health = 90; c.Speed = 4.2f; c.ChaseRange = 30; c.AttackRange = 2; c.Damage = 16; c.AttackCooldown = 1;
            }
        }
    }
}
