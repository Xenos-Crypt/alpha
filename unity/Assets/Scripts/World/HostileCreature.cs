using System.Collections.Generic;
using UnityEngine;

namespace AnotherWorld.World
{
    // The combat gap this world actually has: PlayerPowers can deal damage out
    // (to vehicles via Damage(), to pedestrians via HitArea()) but nothing can
    // hit back. HostileCreature is that — wildlife, cave dwellers, or an armed
    // guard that chases the player and attacks on contact, with its own
    // health/knockback/recovery mirroring CrossingWalker's pattern so it slots
    // into the same area-damage sweeps PlayerPowers already does.
    //
    // Set MilitaryGuard=true for a unit that only turns hostile while
    // MilitaryAlert.Active is true (see MilitaryAlert.cs) — used for base
    // defenders that are passive until the player steals something.
    public sealed class HostileCreature : MonoBehaviour
    {
        public static readonly List<HostileCreature> All = new();

        public float MaxHealth = 60, Health = 60;
        public float Speed = 4.5f, ChaseRange = 18, AttackRange = 1.5f, Damage = 10, AttackCooldown = 1.2f;
        public float StunnedUntil;
        public bool MilitaryGuard;
        public string Label = "Creature";

        Vector3 home;
        float attackReady, recoverAt;
        NeighbourhoodPlayer target;

        void Awake() { home = transform.position; All.Add(this); }
        void OnDestroy() { All.Remove(this); }
        void Start() { Health = MaxHealth; target = FindObjectOfType<NeighbourhoodPlayer>(); }

        bool Alert => !MilitaryGuard || (MilitaryAlert.Active);

        void Update()
        {
            if (Health <= 0)
            {
                if (Time.time >= recoverAt) { Health = MaxHealth; transform.position = home; }
                return;
            }
            // Distant creatures skip simulation entirely, same culling CrossingWalker uses.
            if (Camera.main && (Camera.main.transform.position - transform.position).sqrMagnitude > 32400) return;
            if (Time.time < StunnedUntil || !target) return;

            var to = target.transform.position - transform.position; to.y = 0;
            float dist = to.magnitude;
            Vector3 move = Vector3.zero;
            if (Alert && dist < ChaseRange && dist > 0.1f) move = to.normalized * Speed;
            else { var toHome = home - transform.position; toHome.y = 0; if (toHome.magnitude > 2) move = toHome.normalized * Speed * 0.5f; }

            if (move.sqrMagnitude > 0.0001f)
            {
                transform.position += move * Time.deltaTime;
                transform.rotation = Quaternion.Slerp(transform.rotation, Quaternion.LookRotation(move), 8 * Time.deltaTime);
            }

            if (Alert && dist < AttackRange && Time.time >= attackReady)
            {
                attackReady = Time.time + AttackCooldown;
                target.Health -= Mathf.RoundToInt(Damage);   // Health's own setter already respects Powers.Invulnerable
            }
        }

        public void ApplyHit(float damage, float stun)
        {
            if (Health <= 0) return;
            Health = Mathf.Max(0, Health - damage);
            StunnedUntil = Mathf.Max(StunnedUntil, Time.time + stun);
            if (Health == 0) recoverAt = Time.time + 12;
        }

        // Mirrors the shape of PlayerPowers' vehicle/walker hit sweeps — called
        // from there so creatures take damage from punches, dashes and skills
        // exactly like everything else the player can hit.
        public static void HitArea(Vector3 centre, float radius, float damage, float stun, HashSet<Object> hitIds)
        {
            foreach (var c in All)
            {
                if (!c || c.Health <= 0 || (hitIds != null && hitIds.Contains(c))) continue;
                if (Vector3.Distance(c.transform.position, centre) > radius) continue;
                c.ApplyHit(damage, stun);
                hitIds?.Add(c);
            }
        }
    }
}
