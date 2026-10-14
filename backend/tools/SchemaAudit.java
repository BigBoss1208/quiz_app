import java.sql.*;
public class SchemaAudit {
 public static void main(String[] args) throws Exception {
  String url=System.getenv("DB_URL");
  if(url==null) {System.out.println("DB_URL unavailable");return;}
  System.out.println("DB_URL_FORMAT="+(url.startsWith("jdbc:postgresql:")?"JDBC_POSTGRESQL":"INVALID_FOR_JDBC"));
  try { java.net.URI uri=java.net.URI.create(url.replaceFirst("^jdbc:",""));String host=uri.getHost();
   System.out.println("DB_HOST_KIND="+(host!=null && host.startsWith("dpg-") && !host.contains(".")?"RENDER_INTERNAL_HOST":host!=null && host.endsWith("render.com")?"RENDER_EXTERNAL_HOST":"OTHER_OR_INVALID"));
  } catch(IllegalArgumentException ignored) { System.out.println("DB_HOST_KIND=INVALID"); }
  java.util.Properties props=new java.util.Properties();props.setProperty("user",System.getenv("DB_USERNAME"));props.setProperty("password",System.getenv("DB_PASSWORD"));props.setProperty("connectTimeout","10");props.setProperty("socketTimeout","10");
  try(Connection c=DriverManager.getConnection(url,props)) {
   c.setReadOnly(true);
   try(Statement s=c.createStatement();ResultSet r=s.executeQuery("SELECT table_name,column_name,data_type,is_nullable FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('chu_de','cau_hoi','dap_an','nhom_mon') ORDER BY table_name,ordinal_position")) {
    while(r.next()) System.out.println(r.getString(1)+"."+r.getString(2)+" "+r.getString(3)+" nullable="+r.getString(4));
   }
  } catch(SQLException e) {
   System.out.println("Schema audit unavailable: SQLSTATE="+e.getSQLState()+", "+e.getClass().getSimpleName());
   for(Throwable cause=e;cause!=null;cause=cause.getCause()) {
    String msg=cause.getMessage()==null?"":cause.getMessage();
    for(String key:new String[]{"DB_URL","DB_USERNAME","DB_PASSWORD"}) {String secret=System.getenv(key);if(secret!=null&&!secret.isBlank())msg=msg.replace(secret,"[REDACTED]");}
    msg=msg.replaceAll("(?i)(jdbc:)?postgres(ql)?://\\S+","[REDACTED_DB_URL]");
    System.out.println("CAUSE="+cause.getClass().getSimpleName()+": "+msg);
   }
   System.exit(1);
  }
 }
}
