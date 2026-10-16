using UnityEngine;
namespace AnotherWorld.World
{
    public sealed class ResidentGait : MonoBehaviour
    {
        public bool Seated;public Transform[] Hips=new Transform[2],Knees=new Transform[2],Shoulders=new Transform[2];
        public float ActionUntil,ArmPitch,ArmSpread;
        public bool BothArms;
        Vector3 previous;bool initialized;float phase,amount;
        void LateUpdate()
        {
            if(Seated)return;if(!initialized){previous=transform.position;initialized=true;return;}
            if(Camera.main&&(Camera.main.transform.position-transform.position).sqrMagnitude>25600){previous=transform.position;return;}
            float speed=Vector3.Distance(transform.position,previous)/Mathf.Max(Time.deltaTime,.001f);previous=transform.position;
            amount=Mathf.MoveTowards(amount,Mathf.Clamp01(speed/1.6f),Time.deltaTime*6);phase+=Time.deltaTime*Mathf.Min(speed,3)*4.2f;
            for(int i=0;i<2;i++){float swing=Mathf.Sin(phase+i*Mathf.PI)*25*amount;Hips[i].localRotation=Quaternion.Euler(swing,0,0);Knees[i].localRotation=Quaternion.Euler(Mathf.Max(0,-swing)*.85f,0,0);Shoulders[i].localRotation=Quaternion.Euler(-swing*.65f,0,i==0?5:-5);}
            if(Time.time<ActionUntil){Shoulders[1].localRotation=Quaternion.Euler(ArmPitch,0,-12-ArmSpread);if(BothArms)Shoulders[0].localRotation=Quaternion.Euler(ArmPitch,0,12+ArmSpread);}else ArmSpread=0;
        }
    }
}
