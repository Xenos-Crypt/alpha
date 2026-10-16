using System.Collections;
using UnityEngine;
using AnotherWorld.Traffic;

namespace AnotherWorld.World
{
    public sealed class NeighbourhoodAudio : MonoBehaviour
    {
        public NeighbourhoodPlayer Player;
        AudioSource engine,ambience,steps;
        AudioClip footstep;
        bool ready,started;
        float stepTimer;
        IEnumerator Start()
        {
            string[] names={"engine","ambience","footstep","siren"};var clips=new AudioClip[4];
            for(int i=0;i<names.Length;i++)
            {
                clips[i]=Resources.Load<AudioClip>("Audio/"+names[i]);if(!clips[i]){Debug.LogWarning("Missing audio clip: "+names[i]);yield break;}
                clips[i].LoadAudioData();while(clips[i].loadState==AudioDataLoadState.Loading)yield return null;
            }
            engine=gameObject.AddComponent<AudioSource>();engine.clip=clips[0];engine.loop=true;engine.playOnAwake=false;
            ambience=gameObject.AddComponent<AudioSource>();ambience.clip=clips[1];ambience.loop=true;ambience.volume=.1f;ambience.playOnAwake=false;
            steps=gameObject.AddComponent<AudioSource>();steps.volume=.45f;steps.playOnAwake=false;footstep=clips[2];
            foreach(var v in RoadNetwork.Instance.Vehicles)if(v.name=="ambulance")
            {
                var source=v.gameObject.AddComponent<AudioSource>();source.clip=clips[3];source.loop=true;source.spatialBlend=1;source.minDistance=4;source.maxDistance=45;source.rolloffMode=AudioRolloffMode.Linear;source.volume=.6f;source.playOnAwake=false;
            }
            ready=true;
        }
        void Update()
        {
            if(!ready)return;
            // Browser audio begins only after a player gesture; all clips are already decoded.
            if(!started&&(Input.anyKeyDown||Input.GetMouseButtonDown(0)))
            {started=true;engine.Play();ambience.Play();foreach(var source in FindObjectsByType<AudioSource>())if(source.clip&&source.clip.name=="siren"&&source.gameObject.name!="Police dispatch")source.Play();}
            if(!started)return;
            engine.volume=Player.IsDriving?.25f:0;engine.pitch=.8f+Player.VehicleSpeed*.035f;
            stepTimer-=Time.deltaTime;
            if(!Player.IsDriving&&Player.WalkingSpeed>.2f&&stepTimer<=0){steps.PlayOneShot(footstep);stepTimer=.38f;}
        }
    }
}
