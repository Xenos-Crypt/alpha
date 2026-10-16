Shader "AnotherWorld/WindAir"
{
    Properties { _BaseColor("Wind colour",Color)=(0.15,0.8,1,0.13) }
    SubShader
    {
        Tags { "RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent" }
        Pass
        {
            Blend SrcAlpha OneMinusSrcAlpha
            ZWrite Off
            Cull Off
            HLSLPROGRAM
            #pragma vertex vert
            #pragma fragment frag
            #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
            struct Attributes { float4 positionOS:POSITION; float2 uv:TEXCOORD0; };
            struct Varyings { float4 positionCS:SV_POSITION; float2 uv:TEXCOORD0; };
            CBUFFER_START(UnityPerMaterial)
            half4 _BaseColor;
            CBUFFER_END
            Varyings vert(Attributes input){Varyings output;output.positionCS=TransformObjectToHClip(input.positionOS.xyz);output.uv=input.uv;return output;}
            half4 frag(Varyings input):SV_Target
            {
                half bands=0.35+0.65*pow(saturate(sin(input.uv.x*50+input.uv.y*4-_Time.y*9)),4);
                half edge=saturate(input.uv.y*2)*saturate((8-input.uv.y)*0.8);
                return half4(_BaseColor.rgb,_BaseColor.a*bands*edge);
            }
            ENDHLSL
        }
    }
}
