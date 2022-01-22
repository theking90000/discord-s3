import { Box, Button, HStack, Spinner, Text, VStack } from "@chakra-ui/react";
import { GetServerSideProps } from "next";
import { useTranslation } from "next-i18next";
import { serverSideTranslations } from "next-i18next/serverSideTranslations";
import { FC } from "react";
import { BucketWithInfos } from "../../../lib/data";
import SideBar from "../../../components/SideBar";
import { useFetchQuery } from "../../../lib/data-fetch";
import prettyBytes from "pretty-bytes";
import { useRouter } from "next/router";
import Link from "next/link";

const page: FC<{ id: string }> = ({ id }) => {
  const { t } = useTranslation("buckets");
  const { t: common } = useTranslation("common");

  const router = useRouter();

  const { isLoading, isError, data } = useFetchQuery<BucketWithInfos>(
    `buckets/${id}`
  );

  return (
    <SideBar>
      <Box mx="10" my="2" height="100%">
        {isLoading && <Spinner />}
        {isError && <Text color="red.500">{common("error")}</Text>}
        {data && (
          <Box>
            <Text fontSize="2xl" fontFamily="monospace">
              {data.name}
            </Text>
            <Text fontFamily="monospace">
              {t("used_data", {
                replace: {
                  used: prettyBytes(data.objects.totalSize),
                },
              })}
            </Text>
            <Box>
              <Link href={`/buckets/${id}/explore`}>
                <Button>{t("explore")}</Button>
              </Link>
              <Link href={`/buckets/${id}/keys`}>
                <Button>{t("keys")}</Button>
              </Link>
            </Box>
          </Box>
        )}
      </Box>
    </SideBar>
  );
};

export const getServerSideProps: GetServerSideProps = async ({
  locale,
  params,
}) => {
  return {
    props: {
      ...(await serverSideTranslations(locale, ["common", "buckets"])),
      id: params.id,
    },
  };
};

export default page;
