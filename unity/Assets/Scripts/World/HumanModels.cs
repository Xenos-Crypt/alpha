using UnityEngine;
using AnotherWorld.Rendering;

namespace AnotherWorld.World
{
    public static class HumanModels
    {
        static int sequence;
        public static Transform Create(Transform parent,Color clothing,bool seated)
        {
            int variation=sequence++;var root=new GameObject("Resident").transform;root.SetParent(parent,false);
            var gait=root.gameObject.AddComponent<ResidentGait>();gait.Seated=seated;
            var tones=new[]{new Color(.69f,.49f,.34f),new Color(.4f,.26f,.19f),new Color(.84f,.65f,.49f)};
            var skin=WorldShapes.Material("Skin",tones[variation%tones.Length],null,.24f);var shirt=WorldShapes.Material("Cotton shirt",clothing,null,.08f);
            var trousers=WorldShapes.Material("Trousers",variation%2==0?new Color(.12f,.18f,.23f):new Color(.22f,.23f,.2f),null,.08f);
            var shoe=WorldShapes.Material("Leather shoes",new Color(.07f,.08f,.075f),null,.27f);var hair=WorldShapes.Material("Hair",variation%3==0?new Color(.28f,.18f,.1f):new Color(.075f,.06f,.045f),null,.1f);
            var torso=SmoothShapes.Profile("Tailored torso",new[]{new Vector2(0,0),new Vector2(.38f,.02f),new Vector2(.39f,.3f),new Vector2(.48f,.72f),new Vector2(.5f,.87f),new Vector2(.24f,.99f),new Vector2(0,1)});
            var limb=SmoothShapes.Profile("Tapered limb",new[]{new Vector2(0,0),new Vector2(.32f,.02f),new Vector2(.4f,.28f),new Vector2(.5f,.8f),new Vector2(.43f,.96f),new Vector2(0,1)});
            Part(root,"Hips",SmoothShapes.Ellipsoid,new Vector3(.35f,.24f,.25f),new Vector3(0,.8f,0),trousers);
            Part(root,"Shirt",torso,new Vector3(.46f,.58f,.29f),new Vector3(0,.97f,0),shirt);
            Part(root,"Neck",SmoothShapes.Tube,new Vector3(.115f,.105f,.115f),new Vector3(0,1.51f,0),skin);
            var head=SmoothShapes.Profile("Sculpted human head",new[]{new Vector2(0,0),new Vector2(.25f,.03f),new Vector2(.39f,.17f),new Vector2(.47f,.38f),new Vector2(.5f,.64f),new Vector2(.46f,.83f),new Vector2(.3f,.96f),new Vector2(0,1)},24);
            Part(root,"Head",head,new Vector3(.225f,.285f,.225f),new Vector3(0,1.59f,0),skin);
            var crown=SmoothShapes.Profile("Hair crown",new[]{new Vector2(0,0),new Vector2(.47f,.05f),new Vector2(.5f,.3f),new Vector2(.38f,.8f),new Vector2(0,1)});
            Part(root,"Hair",crown,new Vector3(.235f,.1f,.235f),new Vector3(0,1.79f,-.01f),hair);
            Part(root,"Nose",SmoothShapes.Ellipsoid,new Vector3(.035f,.065f,.05f),new Vector3(0,1.695f,.09f),skin);
            var eye=WorldShapes.Material("Eyes",new Color(.11f,.12f,.1f));var white=WorldShapes.Material("Eye whites",new Color(.88f,.87f,.8f));
            for(int side=-1;side<=1;side+=2)
            {
                Part(root,"Ear",SmoothShapes.Ellipsoid,new Vector3(.04f,.075f,.04f),new Vector3(side*.11f,1.69f,0),skin);
                Part(root,"Eye white",SmoothShapes.Disc,new Vector3(.036f,.017f,1),new Vector3(side*.044f,1.744f,.117f),white);
                Part(root,"Pupil",SmoothShapes.Disc,new Vector3(.012f,.014f,1),new Vector3(side*.043f,1.744f,.118f),eye);
            }
            for(int side=-1;side<=1;side+=2)
            {
                Part(root,"Eyebrow",SmoothShapes.Ellipsoid,new Vector3(.042f,.012f,.012f),new Vector3(side*.044f,1.763f,.111f),hair);
                Part(root,"Jacket collar",SmoothShapes.Ellipsoid,new Vector3(.15f,.035f,.13f),new Vector3(side*.07f,1.505f,.06f),shirt);
                Part(root,"Jacket front panel",SmoothShapes.Ellipsoid,new Vector3(.15f,.34f,.035f),new Vector3(side*.105f,1.075f,.126f),shirt);
            }
            Part(root,"Jacket zipper",SmoothShapes.Tube,new Vector3(.008f,.4f,.008f),new Vector3(0,1.07f,.146f),shoe);
            Part(root,"Utility belt",SmoothShapes.Ellipsoid,new Vector3(.355f,.045f,.26f),new Vector3(0,1.005f,0),shoe);
            if(variation%4==0)for(int side=-1;side<=1;side+=2)Part(root,"Swept hair",SmoothShapes.Ellipsoid,new Vector3(.07f,.25f,.15f),new Vector3(side*.105f,1.59f,-.04f),hair);
            Part(root,"Mouth",SmoothShapes.Ellipsoid,new Vector3(.055f,.012f,.012f),new Vector3(0,1.671f,.1f),WorldShapes.Material("Lips",tones[variation%tones.Length]*.64f));
            for(int i=0;i<2;i++)
            {
                int side=i==0?-1:1;
                var hip=Joint(root,"Hip",new Vector3(side*.105f,.94f,0));gait.Hips[i]=hip;
                Part(hip,"Thigh",limb,new Vector3(.18f,.43f,.19f),new Vector3(0,-.43f,0),trousers);
                var knee=Joint(hip,"Knee",new Vector3(0,-.43f,0));gait.Knees[i]=knee;
                Part(knee,"Knee shaping",SmoothShapes.Ellipsoid,new Vector3(.16f,.11f,.17f),new Vector3(0,-.055f,0),trousers);
                Part(knee,"Shin",limb,new Vector3(.14f,.43f,.145f),new Vector3(0,-.43f,0),trousers);
                Part(knee,"Boot sole",SmoothShapes.Ellipsoid,new Vector3(.18f,.055f,.32f),new Vector3(0,-.51f,.075f),shoe);
                Part(knee,"Shoe",SmoothShapes.Ellipsoid,new Vector3(.17f,.13f,.31f),new Vector3(0,-.5f,.075f),shoe);
                var shoulder=Joint(root,"Shoulder",new Vector3(side*.218f,1.455f,0));gait.Shoulders[i]=shoulder;
                Part(shoulder,"Sleeve",limb,new Vector3(.135f,.285f,.14f),new Vector3(0,-.285f,0),shirt);
                var elbow=Joint(shoulder,"Elbow",new Vector3(0,-.28f,0));
                Part(elbow,"Elbow shaping",SmoothShapes.Ellipsoid,new Vector3(.105f,.12f,.105f),new Vector3(0,-.06f,0),skin);
                Part(elbow,"Forearm",limb,new Vector3(.105f,.255f,.11f),new Vector3(0,-.255f,0),variation%3==0?skin:shirt);
                Part(elbow,"Hand",SmoothShapes.Ellipsoid,new Vector3(.09f,.135f,.075f),new Vector3(0,-.34f,0),skin);
                if(seated){hip.localRotation=Quaternion.Euler(-51,0,side*6);knee.localRotation=Quaternion.Euler(94,0,0);shoulder.localRotation=Quaternion.Euler(-58,0,-side*6);elbow.localRotation=Quaternion.Euler(-15,0,0);}
            }
            return root;
        }
        static Transform Joint(Transform parent,string name,Vector3 p){var joint=new GameObject(name).transform;joint.SetParent(parent,false);joint.localPosition=p;return joint;}
        static void Part(Transform parent,string name,Mesh mesh,Vector3 scale,Vector3 p,Material material)
        {var go=SmoothShapes.Part(parent,name,mesh,scale,p,material);GpuMeshBatch.Register(go.GetComponent<MeshRenderer>());}
    }
}
