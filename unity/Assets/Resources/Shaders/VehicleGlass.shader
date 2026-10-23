Shader "AnotherWorld/VehicleGlass"
{
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" "Queue"="Geometry" }
        Pass
        {
            Tags { "LightMode"="SRPDefaultUnlit" }
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #pragma multi_compile_instancing
            #pragma multi_compile_fog
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            struct A {float4 p:POSITION;float3 n:NORMAL;UNITY_VERTEX_INPUT_INSTANCE_ID};
            struct V {float4 p:SV_POSITION;float3 world:TEXCOORD0;float3 normal:TEXCOORD1;float fog:TEXCOORD2;};
            V vert(A i){UNITY_SETUP_INSTANCE_ID(i);V o;o.p=TransformObjectToHClip(i.p.xyz);o.world=TransformObjectToWorld(i.p.xyz);o.normal=TransformObjectToWorldNormal(i.n);o.fog=ComputeFogFactor(o.p.z);return o;}
            half4 frag(V i):SV_Target
            {
                float3 n=normalize(i.normal),v=normalize(GetWorldSpaceViewDir(i.world)),r=reflect(-v,n);
                float fresnel=pow(1-saturate(dot(n,v)),3);
                float horizon=exp(-abs(r.y-.12)*12);
                float cloud=pow(saturate(sin(r.x*6+r.z*9)*.5+.5),8)*exp(-abs(r.y-.46)*15);
                float3 reflected=lerp(float3(.16,.29,.4),float3(.035,.12,.24),saturate(r.y));
                reflected+=horizon*.28+cloud*.35;
                float3 color=lerp(float3(.012,.035,.065),reflected,.55+fresnel*.45)+fresnel*float3(.025,.08,.12);
                return half4(MixFog(color,i.fog),1);
            }
            ENDHLSL
        }
    }
}
