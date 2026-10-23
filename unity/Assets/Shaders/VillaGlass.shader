Shader "AnotherWorld/VillaGlass"
{
    Properties { _BaseColor("Glass tint",Color)=(0.25,0.62,0.85,0.075) }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent" }
        Pass
        {
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Back
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            struct Attributes { float4 positionOS:POSITION; float3 normalOS:NORMAL; };
            struct Varyings { float4 positionCS:SV_POSITION; float3 world:TEXCOORD0; float3 normal:TEXCOORD1; };
            CBUFFER_START(UnityPerMaterial)
            half4 _BaseColor;
            CBUFFER_END
            Varyings vert(Attributes input){Varyings o;o.world=TransformObjectToWorld(input.positionOS.xyz);o.positionCS=TransformWorldToHClip(o.world);o.normal=TransformObjectToWorldNormal(input.normalOS);return o;}
            half4 frag(Varyings input):SV_Target
            {
                float3 view=normalize(_WorldSpaceCameraPos-input.world),normal=normalize(input.normal);
                float fresnel=pow(1-saturate(abs(dot(normal,view))),4);
                float sky=saturate(reflect(-view,normal).y*.5+.5);
                half3 reflection=lerp(half3(.12,.3,.58),half3(.63,.83,1),sky);
                half glint=pow(saturate(dot(reflect(-normalize(float3(.4,.8,-.3)),normal),view)),90);
                return half4(lerp(_BaseColor.rgb,reflection,.65)+glint*.5,lerp(_BaseColor.a,.4,fresnel));
            }
            ENDHLSL
        }
    }
}
